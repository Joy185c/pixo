require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../src/db/pool');

async function testQuery() {
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
        console.log(rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
testQuery();
