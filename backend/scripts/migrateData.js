require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../src/db/pool');

async function migrateData() {
    try {
        console.log('[migrate] Starting old data migration...');

        // 1. Find super admin id
        const { rows } = await pool.query(`SELECT id FROM requester_users WHERE role = 'super_admin' LIMIT 1`);
        if (rows.length === 0) {
            console.error('[migrate] No super_admin found. Cannot migrate.');
            process.exit(1);
        }
        const superAdminId = rows[0].id;
        console.log(`[migrate] Found super admin ID: ${superAdminId}`);

        // 2. Update old invite links
        const { rowCount: ilCount } = await pool.query(
            `UPDATE invite_links SET requester_user_id = $1::uuid WHERE requester_user_id IS NULL`,
            [superAdminId]
        );
        console.log(`[migrate] Updated ${ilCount} invite_links.`);

        // 3. Update old provider sessions
        const { rowCount: psCount } = await pool.query(
            `UPDATE provider_sessions ps
             SET requester_user_id = il.requester_user_id::uuid
             FROM invite_links il
             WHERE ps.invite_id = il.id
             AND ps.requester_user_id IS NULL`
        );
        console.log(`[migrate] Updated ${psCount} provider_sessions.`);

        // 4. Update old shared files
        const { rowCount: sfCount } = await pool.query(
            `UPDATE shared_files sf
             SET requester_user_id = ps.requester_user_id::uuid
             FROM provider_sessions ps
             WHERE sf.session_id = ps.id
             AND sf.requester_user_id IS NULL`
        );
        console.log(`[migrate] Updated ${sfCount} shared_files.`);

        console.log('[migrate] Migration completed successfully.');
    } catch (err) {
        console.error('[migrate] Error:', err);
    } finally {
        await pool.end();
    }
}

migrateData();
