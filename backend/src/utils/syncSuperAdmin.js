const bcrypt = require('bcryptjs');
const { pool } = require('../db/pool');

/**
 * syncSuperAdmin
 *
 * Called on server startup.
 * Always upserts the super_admin account using env vars,
 * so changing SUPER_ADMIN_ACCESS_CODE on Render auto-updates the hash.
 */
async function syncSuperAdmin() {
    const username = process.env.SUPER_ADMIN_USERNAME;
    const password = process.env.SUPER_ADMIN_ACCESS_CODE;

    const hasUsername = !!username;
    const hasPassword = !!password;

    console.log(`[super-admin] SUPER_ADMIN_USERNAME loaded: ${hasUsername}`);
    console.log(`[super-admin] SUPER_ADMIN_ACCESS_CODE loaded: ${hasPassword}`);

    if (!hasUsername || !hasPassword) {
        console.warn('[super-admin] ⚠ Skipping super admin sync — env vars not set.');
        return;
    }

    try {
        const normalizedUsername = username.trim().toLowerCase();
        const hash = await bcrypt.hash(password.trim(), 12);

        const { rows } = await pool.query(
            `SELECT id FROM requester_users WHERE LOWER(email_or_username) = $1`,
            [normalizedUsername]
        );

        if (rows.length === 0) {
            // Create new super admin
            await pool.query(
                `INSERT INTO requester_users (name, email_or_username, access_code_hash, role)
                 VALUES ('Super Admin', $1, $2, 'super_admin')`,
                [normalizedUsername, hash]
            );
            console.log(`[super-admin] ✅ Super admin CREATED: ${normalizedUsername}`);
        } else {
            // Update existing — always re-hash with current env var
            await pool.query(
                `UPDATE requester_users
                 SET access_code_hash = $1,
                     role             = 'super_admin',
                     updated_at       = NOW()
                 WHERE LOWER(email_or_username) = $2`,
                [hash, normalizedUsername]
            );
            console.log(`[super-admin] ✅ Super admin UPDATED: ${normalizedUsername}`);
        }

        // Confirm role
        const { rows: confirmRows } = await pool.query(
            `SELECT role FROM requester_users WHERE LOWER(email_or_username) = $1`,
            [normalizedUsername]
        );
        if (confirmRows.length > 0) {
            console.log(`[super-admin] ✅ Role confirmed: ${confirmRows[0].role}`);
        }
    } catch (err) {
        console.error('[super-admin] ❌ Failed to sync super admin:', err.message);
    }
}

module.exports = { syncSuperAdmin };
