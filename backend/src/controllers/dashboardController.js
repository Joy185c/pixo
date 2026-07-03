const { pool } = require('../db/pool');

/**
 * getDashboardSummary
 *
 * GET /api/dashboard/summary
 *
 * High-level stats for the requester dashboard home screen.
 */
async function getDashboardSummary(req, res) {
    try {
        await pool.query(`SELECT expire_invite_links()`);
        await pool.query(`SELECT expire_provider_sessions()`);

        const { rows } = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM invite_links WHERE status = 'active' AND ($1::uuid IS NULL OR requester_user_id = $1::uuid))  AS active_links,
                (SELECT COUNT(*) FROM invite_links WHERE status = 'expired' AND ($1::uuid IS NULL OR requester_user_id = $1::uuid)) AS expired_links,
                (SELECT COUNT(*) FROM invite_links WHERE ($1::uuid IS NULL OR requester_user_id = $1::uuid))                        AS total_links,
                (SELECT COUNT(*) FROM provider_sessions WHERE status = 'active' AND ($1::uuid IS NULL OR requester_user_id = $1::uuid)) AS active_sessions,
                (SELECT COUNT(*) FROM provider_sessions WHERE ($1::uuid IS NULL OR requester_user_id = $1::uuid))                       AS total_sessions
        `, [req.scopedUserId]);

        return res.json({ summary: rows[0] });
    } catch (err) {
        console.error('[getDashboardSummary] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * getMyLinks
 *
 * GET /api/dashboard/links
 *
 * "My Links" screen data — all invite links with session counts.
 */
async function getMyLinks(req, res) {
    try {
        await pool.query(`SELECT expire_invite_links()`);
        await pool.query(`SELECT expire_provider_sessions()`);

        const { rows } = await pool.query(`
            SELECT
                il.id,
                il.token,
                il.status,
                il.max_devices,
                il.connected_devices_count,
                il.expires_at,
                il.created_at,
                ac.label AS access_code_label,
                COUNT(ps.id) FILTER (WHERE ps.status = 'active')  AS active_session_count,
                COUNT(ps.id) FILTER (WHERE ps.status = 'expired') AS expired_session_count,
                COUNT(ps.id) FILTER (WHERE ps.status = 'revoked') AS revoked_session_count
            FROM  invite_links il
            LEFT JOIN  access_codes ac ON ac.id = il.created_by_code_id
            LEFT JOIN provider_sessions ps ON ps.invite_id = il.id
            WHERE ($1::uuid IS NULL OR il.requester_user_id = $1::uuid)
            GROUP BY il.id, ac.label
            ORDER BY il.created_at DESC
        `, [req.scopedUserId]);

        return res.json({ links: rows });
    } catch (err) {
        console.error('[getMyLinks] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * getLinkDetails
 *
 * GET /api/dashboard/links/:token
 *
 * Link details screen — connected, pending, active, expired sessions.
 */
async function getLinkDetails(req, res) {
    const { token } = req.params;
    try {
        await pool.query(`SELECT expire_invite_links()`);
        await pool.query(`SELECT expire_provider_sessions()`);

        const { rows: linkRows } = await pool.query(
            `SELECT il.*, ac.label AS access_code_label
             FROM   invite_links il
             LEFT JOIN   access_codes ac ON ac.id = il.created_by_code_id
             WHERE  il.token = $1 AND ($2::uuid IS NULL OR il.requester_user_id = $2::uuid)`,
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
                 GREATEST(EXTRACT(EPOCH FROM (expires_at - NOW())), 0)::INT AS seconds_remaining
             FROM  provider_sessions
             WHERE invite_id = $1
             ORDER BY created_at DESC`,
            [link.id]
        );

        return res.json({
            link,
            connected_phones: sessions.filter(s => s.status === 'active'),
            pending_phones:   [],  // future: phones that opened but haven't granted yet
            active_sessions:  sessions.filter(s => s.status === 'active'),
            expired_sessions: sessions.filter(s => s.status === 'expired'),
            revoked_sessions: sessions.filter(s => s.status === 'revoked'),
        });
    } catch (err) {
        console.error('[getLinkDetails] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * getDeviceSession
 *
 * GET /api/dashboard/sessions/:session_id
 *
 * Device session screen — name, time left, permissions, history.
 */
async function getDeviceSession(req, res) {
    const { session_id } = req.params;
    try {
        await pool.query(`SELECT expire_provider_sessions()`);

        const { rows: sessionRows } = await pool.query(
            `SELECT
                 ps.*,
                 GREATEST(EXTRACT(EPOCH FROM (ps.expires_at - NOW())), 0)::INT AS seconds_remaining,
                 il.token AS invite_token
             FROM  provider_sessions ps
             JOIN  invite_links il ON il.id = ps.invite_id
             WHERE ps.id = $1 AND ($2::uuid IS NULL OR ps.requester_user_id = $2::uuid)`,
            [session_id, req.scopedUserId]
        );

        if (sessionRows.length === 0) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        const { rows: history } = await pool.query(
            `SELECT event_type, file_path, metadata, occurred_at
             FROM   access_history
             WHERE  session_id = $1
             ORDER BY occurred_at DESC
             LIMIT 100`,
            [session_id]
        );

        return res.json({
            session:       sessionRows[0],
            access_history: history
        });
    } catch (err) {
        console.error('[getDeviceSession] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

module.exports = { getDashboardSummary, getMyLinks, getLinkDetails, getDeviceSession };
