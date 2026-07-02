/**
 * seed.js — Run once to insert the hashed MVP access code.
 * Usage: node src/db/seed.js
 *
 * This file reads PIXO_ACCESS_CODE from the environment,
 * hashes it, and upserts it into the access_codes table.
 * The plaintext code is NEVER written to disk or the DB.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

async function seed() {
    const rawCode = process.env.PIXO_ACCESS_CODE;
    if (!rawCode) {
        console.error('[seed] ERROR: Set PIXO_ACCESS_CODE env var before running seed.');
        console.error('  Example: PIXO_ACCESS_CODE=pixoaccess26 node src/db/seed.js');
        process.exit(1);
    }

    const rounds   = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const codeHash = await bcrypt.hash(rawCode, rounds);
    const label    = process.env.PIXO_ACCESS_CODE_LABEL || 'MVP Global Access Code';

    const client = await pool.connect();
    try {
        // Remove any old code with same label first (idempotent re-seed)
        await client.query(`DELETE FROM access_codes WHERE label = $1`, [label]);

        const { rows } = await client.query(
            `INSERT INTO access_codes (code_hash, label, is_active, max_link_create, expires_at)
             VALUES ($1, $2, TRUE, 0, NULL)
             RETURNING id, label, is_active, created_at`,
            [codeHash, label]
        );

        console.log('[seed] Access code inserted successfully:');
        console.table(rows);
    } finally {
        client.release();
        await pool.end();
    }
}

seed().catch((err) => {
    console.error('[seed] Fatal error:', err.message);
    process.exit(1);
});
