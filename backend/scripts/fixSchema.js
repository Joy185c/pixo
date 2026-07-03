require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../src/db/pool');

async function fixSchema() {
    try {
        await pool.query(`ALTER TABLE invite_links ALTER COLUMN requester_user_id TYPE UUID USING requester_user_id::uuid`);
        console.log('Fixed invite_links.requester_user_id to UUID');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
fixSchema();
