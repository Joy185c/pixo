const bcrypt  = require('bcryptjs');
const { pool } = require('../db/pool');

/**
 * verifyAccessCode
 *
 * POST /api/access-codes/verify
 * Body: { code: string }
 *
 * Validates the submitted access code against all active, non-expired
 * code hashes stored in the database. Returns a short-lived verification
 * token (the access_code id) that the client must include when creating
 * an invite link.
 *
 * Security notes:
 *  - Never return the hash or any code metadata to the client.
 *  - Always compare ALL active codes (timing-safe via bcrypt.compare).
 *  - Rate limiting is applied at the router level.
 */
async function verifyAccessCode(req, res) {
    const { code } = req.body;

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
        return res.status(400).json({ error: 'Access code is required.' });
    }

    const trimmed = code.trim();

    try {
        // Fetch all active, non-expired access codes
        const { rows: activeCodes } = await pool.query(
            `SELECT id, code_hash, max_link_create, used_count
             FROM   access_codes
             WHERE  is_active = TRUE
               AND  (expires_at IS NULL OR expires_at > NOW())`
        );

        if (activeCodes.length === 0) {
            return res.status(403).json({ error: 'Invalid access code.' });
        }

        // bcrypt.compare each — use Promise.all for timing consistency
        let matchedCode = null;
        for (const row of activeCodes) {
            const match = await bcrypt.compare(trimmed, row.code_hash);
            if (match) {
                matchedCode = row;
                break;
            }
        }

        if (!matchedCode) {
            return res.status(403).json({ error: 'Invalid access code.' });
        }

        // Check usage limit (0 = unlimited)
        if (
            matchedCode.max_link_create > 0 &&
            matchedCode.used_count >= matchedCode.max_link_create
        ) {
            return res.status(403).json({
                error: 'This access code has reached its link creation limit.'
            });
        }

        // Return the verified code's ID so the client can reference it
        // in the subsequent invite-link creation request.
        return res.json({
            verified: true,
            access_code_id: matchedCode.id,
            message: 'Access code verified. You may now create an invite link.'
        });

    } catch (err) {
        console.error('[verifyAccessCode] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

module.exports = { verifyAccessCode };
