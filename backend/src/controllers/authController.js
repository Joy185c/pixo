const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/pool');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-pixo-key';

async function signup(req, res) {
    const { name, emailOrUsername, accessCode } = req.body;
    if (!name || !emailOrUsername || !accessCode) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const normalizedEmailOrUsername = emailOrUsername.trim().toLowerCase();
    const normalizedAccessCode = accessCode.trim();

    try {
        const { rows } = await pool.query('SELECT id FROM requester_users WHERE LOWER(email_or_username) = $1', [normalizedEmailOrUsername]);
        if (rows.length > 0) return res.status(400).json({ error: 'Username/Email already exists' });

        const hash = await bcrypt.hash(normalizedAccessCode, 10);
        
        const insertRes = await pool.query(
            `INSERT INTO requester_users (name, email_or_username, access_code_hash, role) 
             VALUES ($1, $2, $3, 'user') RETURNING id, name, email_or_username, role`,
            [name, normalizedEmailOrUsername, hash]
        );
        
        const user = insertRes.rows[0];
        const token = jwt.sign({ requesterUserId: user.id, emailOrUsername: user.email_or_username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        
        return res.json({ token, user: { id: user.id, name: user.name, emailOrUsername: user.email_or_username, role: user.role } });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function login(req, res) {
    const { emailOrUsername, accessCode } = req.body;
    if (!emailOrUsername || !accessCode) return res.status(400).json({ error: 'Missing required fields' });

    const normalizedEmailOrUsername = emailOrUsername.trim().toLowerCase();
    const normalizedAccessCode = accessCode.trim();

    try {
        const { rows } = await pool.query('SELECT * FROM requester_users WHERE LOWER(email_or_username) = $1', [normalizedEmailOrUsername]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid username or access code' });

        const user = rows[0];
        const isMatch = await bcrypt.compare(normalizedAccessCode, user.access_code_hash);
        if (!isMatch) return res.status(401).json({ error: 'Invalid username or access code' });

        const token = jwt.sign({ requesterUserId: user.id, emailOrUsername: user.email_or_username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token, user: { id: user.id, name: user.name, emailOrUsername: user.email_or_username, role: user.role } });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function getMe(req, res) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const { rows } = await pool.query('SELECT id, name, email_or_username, role FROM requester_users WHERE id = $1', [req.user.requesterUserId]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const user = rows[0];
        return res.json({ user: { id: user.id, name: user.name, emailOrUsername: user.email_or_username, role: user.role } });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { signup, login, getMe };
