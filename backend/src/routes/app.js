const router  = require('express').Router();
const { pool } = require('../db/pool');

/**
 * POST /api/app/resolve-invite
 * Mobile app calls this to validate a token before showing permission screen.
 * Body: { token, deviceName?, userAgent? }
 */
router.post('/resolve-invite', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token is required.' });

    try {
        await pool.query('SELECT expire_invite_links()');
        await pool.query('SELECT expire_provider_sessions()');

        const { rows } = await pool.query(
            `SELECT il.id, il.token, il.status, il.max_devices,
                    il.connected_devices_count, il.expires_at,
                    ac.label AS access_code_label
             FROM   invite_links il
             JOIN   access_codes ac ON ac.id = il.created_by_code_id
             WHERE  il.token = $1`,
            [token]
        );

        if (rows.length === 0) return res.status(404).json({ error: 'Invite link not found.' });

        const link = rows[0];
        if (link.status !== 'active')
            return res.status(403).json({ error: `Invite link is ${link.status}.` });

        const connected = parseInt(link.connected_devices_count) || 0;
        if (connected >= link.max_devices)
            return res.status(403).json({ error: 'This link has reached its device limit.' });

        return res.json({
            valid: true,
            link: {
                token: link.token,
                status: link.status,
                max_devices: link.max_devices,
                connected_devices_count: connected,
                expires_at: link.expires_at,
                access_code_label: link.access_code_label,
            },
        });
    } catch (err) {
        console.error('[resolve-invite]', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * POST /api/app/approve-invite
 * Mobile app calls this after user taps "Allow Access".
 * Body: { token, providerDeviceName, allowedPermissions }
 *
 * allowedPermissions: { photos: bool, videos: bool, pdfs: bool, documents: bool, whatsapp: bool }
 */
router.post('/approve-invite', async (req, res) => {
    const { token, providerDeviceName, allowedPermissions = {} } = req.body;

    if (!token || !providerDeviceName)
        return res.status(400).json({ error: 'token and providerDeviceName are required.' });

    // Convert { photos: true, videos: false, ... } → ['photos']
    const permissions = Object.entries(allowedPermissions)
        .filter(([, v]) => v === true)
        .map(([k]) => k);

    const SESSION_TTL_HOURS = parseInt(process.env.SESSION_TTL_HOURS || '4320', 10);

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        await client.query('SELECT expire_invite_links()');
        await client.query('SELECT expire_provider_sessions()');

        // Lock & validate link
        const { rows: linkRows } = await client.query(
            `SELECT id, status, max_devices, connected_devices_count
             FROM   invite_links WHERE token = $1 FOR UPDATE`,
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
            return res.status(403).json({ error: 'Device limit reached.' });
        }

        const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
        const providerIp = req.ip || null;
        // Generate a stable device ID from device name + token (deterministic for same device)
        const deviceId = `app_${Buffer.from(token + providerDeviceName).toString('base64').slice(0, 16)}`;

        // Check for existing active session from same device
        const { rows: existing } = await client.query(
            `SELECT id FROM provider_sessions
             WHERE invite_id = $1 AND provider_device_id = $2 AND status = 'active'`,
            [link.id, deviceId]
        );
        if (existing.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: 'This device already has an active session.',
                session_id: existing[0].id,
            });
        }

        const { rows: sessRows } = await client.query(
            `INSERT INTO provider_sessions
               (invite_id, provider_device_id, provider_device_name, provider_ip, allowed_permissions, expires_at)
             VALUES ($1,$2,$3,$4,$5,$6)
             RETURNING id, status, allowed_permissions, expires_at, created_at`,
            [link.id, deviceId, providerDeviceName, providerIp, JSON.stringify(permissions), expiresAt]
        );

        await client.query(
            `INSERT INTO access_history (session_id, event_type, metadata) VALUES ($1,'connected',$2)`,
            [sessRows[0].id, JSON.stringify({ device_name: providerDeviceName, ip: providerIp })]
        );

        await client.query('COMMIT');

        return res.status(201).json({
            sessionId: sessRows[0].id,
            expiresAt: sessRows[0].expires_at,
            status: sessRows[0].status,
            allowedPermissions: sessRows[0].allowed_permissions,
        });
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('[approve-invite]', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    } finally {
        if (client) client.release();
    }
});

module.exports = router;
