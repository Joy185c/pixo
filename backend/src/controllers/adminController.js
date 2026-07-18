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
                u.role,
                u.status,
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

// Admin file controls
async function deleteFile(req, res) {
    const { fileToken } = req.params;
    try {
        await pool.query(`DELETE FROM shared_files WHERE file_token = $1`, [fileToken]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Internal error' });
    }
}

async function permanentDeleteFile(req, res) {
    const { fileToken } = req.params;
    try {
        await pool.query(`DELETE FROM shared_files WHERE file_token = $1`, [fileToken]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Internal error' });
    }
}

async function bulkDeleteFiles(req, res) {
    const { fileTokens } = req.body;
    if (!Array.isArray(fileTokens) || fileTokens.length === 0) return res.status(400).json({ error: 'Tokens required' });
    try {
        await pool.query(`DELETE FROM shared_files WHERE file_token = ANY($1)`, [fileTokens]);
        res.json({ success: true, count: fileTokens.length });
    } catch (err) {
        res.status(500).json({ error: 'Internal error' });
    }
}

async function deleteUserFiles(req, res) {
    const { userId } = req.params;
    const { category } = req.query;
    try {
        if (category) {
            await pool.query(`DELETE FROM shared_files WHERE requester_user_id = $1 AND category = $2`, [userId, category]);
        } else {
            await pool.query(`DELETE FROM shared_files WHERE requester_user_id = $1`, [userId]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Internal error' });
    }
}

async function deleteSessionFiles(req, res) {
    const { sessionId } = req.params;
    try {
        await pool.query(`DELETE FROM shared_files WHERE session_id = $1`, [sessionId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Internal error' });
    }
}

// Admin user controls
async function updateUserStatus(req, res, status, dateField) {
    const { userId } = req.params;
    try {
        await pool.query(
            `UPDATE requester_users SET status = $1, ${dateField} = NOW() WHERE id = $2`,
            [status, userId]
        );
        if (status === 'banned' || status === 'deleted') {
            await pool.query(`UPDATE provider_sessions SET status = 'revoked', revoked_at = NOW() WHERE requester_user_id = $1`, [userId]);
            await pool.query(`UPDATE invite_links SET status = 'disabled' WHERE requester_user_id = $1`, [userId]);
        }
        res.json({ success: true, status });
    } catch (err) {
        res.status(500).json({ error: 'Internal error' });
    }
}

const freezeUser = (req, res) => updateUserStatus(req, res, 'frozen', 'frozen_at');
const unfreezeUser = (req, res) => updateUserStatus(req, res, 'active', 'updated_at');
const banUser = (req, res) => updateUserStatus(req, res, 'banned', 'banned_at');
const unbanUser = (req, res) => updateUserStatus(req, res, 'active', 'updated_at');
const deleteUser = (req, res) => updateUserStatus(req, res, 'deleted', 'deleted_at');

module.exports = { 
    getOverview, getUsers,
    deleteFile, permanentDeleteFile, bulkDeleteFiles, deleteUserFiles, deleteSessionFiles,
    freezeUser, unfreezeUser, banUser, unbanUser, deleteUser
};
