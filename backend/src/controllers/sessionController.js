const { pool } = require('../db/pool');

const SESSION_TTL_HOURS = parseInt(process.env.SESSION_TTL_HOURS || '6', 10);

/**
 * joinSession
 *
 * POST /api/sessions/join
 * Body: { token, device_id, device_name, permissions? }
 *
 * Called when a provider phone opens an invite link and taps "Grant Access."
 * Validates the link, checks device limits, creates a new session.
 */
async function joinSession(req, res) {
    const {
        token,
        device_id,
        device_name,
        user_agent,
        permissions = []
    } = req.body;

    if (!token || !device_id || !device_name) {
        return res.status(400).json({
            error: 'token, device_id, and device_name are required.'
        });
    }

    let client;
    try {
        client = await pool.connect();
    } catch (connErr) {
        console.error('[joinSession] Database connection failed:', connErr.message);
        return res.status(503).json({ error: 'Database service temporarily unavailable. Please try again.' });
    }

    try {
        await client.query('BEGIN');

        // Run expiry helpers
        await client.query(`SELECT expire_invite_links()`);
        await client.query(`SELECT expire_provider_sessions()`);

        // Lock the invite link row
        const { rows: linkRows } = await client.query(
            `SELECT id, status, max_devices, connected_devices_count
             FROM   invite_links
             WHERE  token = $1
             FOR UPDATE`,
            [token]
        );

        if (linkRows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Invite link not found.' });
        }

        const link = linkRows[0];

        if (link.status !== 'active') {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: `Invite link is ${link.status}.` });
        }

        if (link.connected_devices_count >= link.max_devices) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                error: `This link has reached its maximum of ${link.max_devices} connected devices.`
            });
        }

        // Check if this device already has an ACTIVE session on this link
        const { rows: existing } = await client.query(
            `SELECT id FROM provider_sessions
             WHERE invite_id = $1 AND provider_device_id = $2 AND status = 'active'`,
            [link.id, device_id]
        );
        if (existing.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: 'This device already has an active session for this link.',
                session_id: existing[0].id
            });
        }

        const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
        const providerIp = req.ip || null;

        const { rows: sessionRows } = await client.query(
            `INSERT INTO provider_sessions
                 (invite_id, provider_device_id, provider_device_name,
                  provider_user_agent, provider_ip, allowed_permissions, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, status, allowed_permissions, expires_at, created_at`,
            [
                link.id,
                device_id,
                device_name,
                user_agent || req.headers['user-agent'] || null,
                providerIp,
                JSON.stringify(permissions),
                expiresAt
            ]
        );

        // Log connection event
        await client.query(
            `INSERT INTO access_history (session_id, event_type, metadata)
             VALUES ($1, 'connected', $2)`,
            [sessionRows[0].id, JSON.stringify({ device_name, ip: providerIp })]
        );

        await client.query('COMMIT');

        return res.status(201).json({
            message: 'Session created. Provider device is now connected.',
            session: sessionRows[0]
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[joinSession] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    } finally {
        client.release();
    }
}

/**
 * getSessionDetails
 *
 * GET /api/sessions/:session_id
 *
 * Returns full session info including time remaining.
 */
async function getSessionDetails(req, res) {
    const { session_id } = req.params;
    try {
        await pool.query(`SELECT expire_provider_sessions()`);

        const { rows } = await pool.query(
            `SELECT
                 ps.*,
                 (ps.expires_at - NOW()) AS time_remaining,
                 il.token                AS invite_token
             FROM  provider_sessions ps
             JOIN  invite_links il ON il.id = ps.invite_id
             WHERE ps.id = $1`,
            [session_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        return res.json({ session: rows[0] });
    } catch (err) {
        console.error('[getSessionDetails] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * revokeSession
 *
 * PATCH /api/sessions/:session_id/revoke
 *
 * Requester can forcibly end a specific provider session.
 */
async function revokeSession(req, res) {
    const { session_id } = req.params;
    let client;
    try {
        client = await pool.connect();
    } catch (connErr) {
        console.error('[revokeSession] Database connection failed:', connErr.message);
        return res.status(503).json({ error: 'Database service temporarily unavailable. Please try again.' });
    }

    try {
        await client.query('BEGIN');

        const { rows } = await client.query(
            `UPDATE provider_sessions
             SET    status     = 'revoked',
                    revoked_at = NOW()
             WHERE  id     = $1
               AND  status = 'active'
             RETURNING id, invite_id, provider_device_name`,
            [session_id]
        );

        if (rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Active session not found.' });
        }

        await client.query(
            `INSERT INTO access_history (session_id, event_type)
             VALUES ($1, 'revoked')`,
            [session_id]
        );

        await client.query('COMMIT');
        return res.json({
            message: `Session for "${rows[0].provider_device_name}" has been revoked.`
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[revokeSession] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    } finally {
        client.release();
    }
}

/**
 * listFilesInSession
 *
 * GET /api/sessions/:session_id/files
 *
 * Placeholder: returns the allowed permissions for this session.
 * In full implementation, the provider device would push file metadata
 * to this session via a WebSocket/push channel.
 */
async function listFilesInSession(req, res) {
    const { session_id } = req.params;
    try {
        await pool.query(`SELECT expire_provider_sessions()`);

        const { rows } = await pool.query(
            `SELECT id, status, allowed_permissions, expires_at
             FROM   provider_sessions
             WHERE  id = $1`,
            [session_id]
        );

        if (rows.length === 0) return res.status(404).json({ error: 'Session not found.' });
        if (rows[0].status !== 'active') {
            return res.status(403).json({ error: `Session is ${rows[0].status}.` });
        }

        // Log file-list event
        await pool.query(
            `INSERT INTO access_history (session_id, event_type) VALUES ($1, 'file_listed')`,
            [session_id]
        );

        return res.json({
            session_id,
            status: rows[0].status,
            allowed_permissions: rows[0].allowed_permissions,
            expires_at: rows[0].expires_at,
            note: 'File listing is delivered via the real-time channel in the full implementation.'
        });
    } catch (err) {
        console.error('[listFilesInSession] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

module.exports = { joinSession, getSessionDetails, revokeSession, listFilesInSession };
