const { customAlphabet } = require('nanoid');
const { pool }           = require('../db/pool');

// Token generator: uppercase letters + digits, 6 chars → e.g. "8K29A3"
const generateToken = customAlphabet('ABCDEFGHIJKLMNPQRSTUVWXYZ123456789', 6);

const DEFAULT_MAX_DEVICES     = parseInt(process.env.DEFAULT_MAX_DEVICES     || '25',  10);
const INVITE_LINK_TTL_HOURS   = parseInt(process.env.INVITE_LINK_TTL_HOURS   || '24', 10);

/**
 * createInviteLink
 *
 * POST /api/invite-links
 * Body: { access_code_id: string, max_devices?: number }
 *
 * Only executes if the client has already verified a valid access code.
 * Atomically:
 *   1. Checks the access_code is still valid.
 *   2. Generates a unique PX-XXXXXX token.
 *   3. Inserts the invite_link row.
 *   4. Increments used_count on the access_code.
 */
async function createInviteLink(req, res) {
    const { access_code_id, max_devices } = req.body;
    // access_code_id is now optional — JWT-authenticated users can create links without it

    let client;
    try {
        client = await pool.connect();
    } catch (connErr) {
        console.error('[createInviteLink] Database connection failed:', connErr.message);
        return res.status(503).json({ error: 'Database service temporarily unavailable. Please try again.' });
    }

    try {
        await client.query('BEGIN');

        let code = null;
        if (access_code_id) {
            // Re-validate the access code inside the transaction
            const { rows: codeRows } = await client.query(
                `SELECT id, max_link_create, used_count
                 FROM   access_codes
                 WHERE  id        = $1
                   AND  is_active = TRUE
                   AND  (expires_at IS NULL OR expires_at > NOW())
                 FOR UPDATE`,
                [access_code_id]
            );

            if (codeRows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(403).json({ error: 'Access code is not valid or has expired.' });
            }

            code = codeRows[0];
            if (code.max_link_create > 0 && code.used_count >= code.max_link_create) {
                await client.query('ROLLBACK');
                return res.status(403).json({ error: 'Link creation limit reached for this access code.' });
            }
        }

        // Generate a unique token (retry on collision)
        let token;
        let attempts = 0;
        while (attempts < 5) {
            const candidate = `PX-${generateToken()}`;
            const { rows: existing } = await client.query(
                `SELECT 1 FROM invite_links WHERE token = $1`, [candidate]
            );
            if (existing.length === 0) { token = candidate; break; }
            attempts++;
        }
        if (!token) throw new Error('Failed to generate a unique token.');

        const expiresAt  = new Date(Date.now() + INVITE_LINK_TTL_HOURS * 60 * 60 * 1000);
        const maxDevices = Math.min(
            parseInt(max_devices, 10) || DEFAULT_MAX_DEVICES,
            50   // hard cap
        );

        const { rows: linkRows } = await client.query(
            `INSERT INTO invite_links
                 (token, created_by_code_id, max_devices, expires_at, requester_user_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, token, max_devices, status, expires_at, created_at`,
            [token, access_code_id || null, maxDevices, expiresAt, req.user.requesterUserId]
        );

        // Increment usage count only if access code was provided
        if (access_code_id && code) {
            await client.query(
                `UPDATE access_codes SET used_count = used_count + 1 WHERE id = $1`,
                [access_code_id]
            );
        }

        await client.query('COMMIT');

        return res.status(201).json({
            message: 'Invite link created successfully.',
            link: linkRows[0]
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[createInviteLink] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    } finally {
        client.release();
    }
}

/**
 * getInviteLinks
 *
 * GET /api/invite-links
 *
 * Returns all invite links (for the requester dashboard).
 * Auto-expires stale links before returning.
 */
async function getInviteLinks(req, res) {
    try {
        // Auto-expire stale links
        await pool.query(`SELECT expire_invite_links()`);

        const { rows } = await pool.query(
            `SELECT
                 il.id,
                 il.token,
                 il.status,
                 il.max_devices,
                 il.connected_devices_count,
                 il.expires_at,
                 il.created_at,
                 ac.label AS access_code_label
             FROM  invite_links il
             JOIN  access_codes ac ON ac.id = il.created_by_code_id
             WHERE ($1::uuid IS NULL OR il.requester_user_id = $1::uuid)
             ORDER BY il.created_at DESC`,
            [req.scopedUserId]
        );

        return res.json({ links: rows });
    } catch (err) {
        console.error('[getInviteLinks] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * getInviteLinkDetails
 *
 * GET /api/invite-links/:token
 *
 * Returns full details for one link including all sessions.
 */
async function getInviteLinkDetails(req, res) {
    const { token } = req.params;
    try {
        await pool.query(`SELECT expire_invite_links()`);
        await pool.query(`SELECT expire_provider_sessions()`);

        const { rows: linkRows } = await pool.query(
            `SELECT * FROM invite_links WHERE token = $1 AND ($2::uuid IS NULL OR requester_user_id = $2::uuid)`, 
            [token, req.scopedUserId]
        );
        if (linkRows.length === 0) {
            return res.status(404).json({ error: 'Invite link not found.' });
        }
        const link = linkRows[0];

        const { rows: sessions } = await pool.query(
            `SELECT
                 id,
                 provider_device_name,
                 provider_device_id,
                 status,
                 allowed_permissions,
                 expires_at,
                 revoked_at,
                 created_at,
                 (expires_at - NOW()) AS time_remaining
             FROM  provider_sessions
             WHERE invite_id = $1
             ORDER BY created_at DESC`,
            [link.id]
        );

        return res.json({
            link,
            sessions: {
                active:  sessions.filter(s => s.status === 'active'),
                expired: sessions.filter(s => s.status === 'expired'),
                revoked: sessions.filter(s => s.status === 'revoked'),
            }
        });
    } catch (err) {
        console.error('[getInviteLinkDetails] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * disableInviteLink
 *
 * PATCH /api/invite-links/:token/disable
 *
 * Admin action to disable a link (also revokes all active sessions).
 */
async function disableInviteLink(req, res) {
    const { token } = req.params;
    let client;
    try {
        client = await pool.connect();
    } catch (connErr) {
        console.error('[disableInviteLink] Database connection failed:', connErr.message);
        return res.status(503).json({ error: 'Database service temporarily unavailable. Please try again.' });
    }

    try {
        await client.query('BEGIN');

        const { rows } = await client.query(
            `UPDATE invite_links
             SET    status = 'disabled'
             WHERE  token  = $1
               AND  status != 'disabled'
               AND  ($2::uuid IS NULL OR requester_user_id = $2::uuid)
             RETURNING id`,
            [token, req.scopedUserId]
        );
        if (rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Link not found or already disabled.' });
        }

        // Revoke all active sessions under this link
        await client.query(
            `UPDATE provider_sessions
             SET    status     = 'revoked',
                    revoked_at = NOW()
             WHERE  invite_id  = $1
               AND  status     = 'active'`,
            [rows[0].id]
        );

        await client.query('COMMIT');
        return res.json({ message: 'Invite link disabled and all sessions revoked.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[disableInviteLink] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    } finally {
        client.release();
    }
}

/**
 * verifyInviteLink
 *
 * GET /api/invite-links/verify/:token
 *
 * Public endpoint for providers (mobile app or simulator) to verify
 * the status of a link without needing authentication.
 */
async function verifyInviteLink(req, res) {
    const { token } = req.params;
    try {
        await pool.query(`SELECT expire_invite_links()`);
        const { rows } = await pool.query(
            `SELECT id, token, max_devices, connected_devices_count, status
             FROM invite_links
             WHERE token = $1`,
            [token]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Invite link not found.' });
        }
        return res.json({ link: rows[0] });
    } catch (err) {
        console.error('[verifyInviteLink] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

module.exports = {
    createInviteLink,
    getInviteLinks,
    getInviteLinkDetails,
    disableInviteLink,
    verifyInviteLink
};
