/**
 * scripts/seedAdmin.js
 * Run once to create the Super Admin account.
 * Usage: node scripts/seedAdmin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db/pool');

async function seed() {
    const username = process.env.SUPER_ADMIN_USERNAME;
    const password = process.env.SUPER_ADMIN_ACCESS_CODE;

    if (!username || !password) {
        console.error('❌ SUPER_ADMIN_USERNAME and SUPER_ADMIN_ACCESS_CODE must be set in .env');
        process.exit(1);
    }

    try {
        const hash = await bcrypt.hash(password, 12);
        const { rows } = await pool.query(
            `INSERT INTO requester_users (name, email_or_username, access_code_hash, role)
             VALUES ('Super Admin', $1, $2, 'super_admin')
             ON CONFLICT (email_or_username) DO UPDATE
               SET access_code_hash = EXCLUDED.access_code_hash,
                   role = 'super_admin',
                   updated_at = NOW()
             RETURNING id, email_or_username, role`,
            [username, hash]
        );

        if (rows.length > 0) {
            console.log(`✅ Super Admin seeded successfully:`);
            console.log(`   ID:       ${rows[0].id}`);
            console.log(`   Username: ${rows[0].email_or_username}`);
            console.log(`   Role:     ${rows[0].role}`);
        }
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
    } finally {
        await pool.end();
    }
}

seed();
