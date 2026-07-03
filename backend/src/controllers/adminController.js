const { pool } = require('../db/pool');

async function getOverview(req, res) {
    try {
        const { rows } = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM requester_users) AS total_users,
                (SELECT COUNT(*) FROM invite_links) AS total_links,
                (SELECT COUNT(*) FROM provider_sessions) AS total_sessions,
                (SELECT COUNT(*) FROM provider_sessions WHERE status = 'active') AS active_sessions,
                (SELECT COUNT(*) FROM shared_files) AS total_files
        `);
        return res.json({ overview: rows[0] });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

async function getUsers(req, res) {
    try {
        const { rows } = await pool.query(`
            SELECT
                u.id,
                u.name,
                u.email_or_username,
                u.created_at,
                (SELECT COUNT(*) FROM invite_links WHERE requester_user_id = u.id) AS total_links,
                (SELECT COUNT(*) FROM provider_sessions WHERE requester_user_id = u.id) AS total_sessions,
                (SELECT COUNT(*) FROM shared_files WHERE requester_user_id = u.id) AS total_files
            FROM requester_users u
            ORDER BY u.created_at DESC
        `);
        return res.json({ users: rows });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

module.exports = { getOverview, getUsers };
