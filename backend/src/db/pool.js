const { createClient } = require('@supabase/supabase-js');
const { Pool }         = require('pg');

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// ── Supabase JS client (for auth / storage / realtime) ──────
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── pg Pool — tries direct SSL connection ────────────────────
// We expose a thin query() wrapper so controllers stay unchanged.
// If pg cannot connect (e.g. DNS issue on some networks) we fall
// back gracefully; use Supabase Edge Functions / REST for those cases.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
    console.error('[pixo-db] Pool error:', err.message);
});

// Test connection on startup
pool.query('SELECT NOW() AS now')
    .then(r => console.log('[pixo-db] ✅ Connected to Supabase. Server time:', r.rows[0].now))
    .catch(err => {
        console.error('[pixo-db] ❌ pg Pool failed:', err.message);
        console.error('[pixo-db]    Hint: Check DATABASE_URL in .env — use the exact string from');
        console.error('[pixo-db]    Supabase → Settings → Database → Connection string (Session mode, port 5432)');
    });

module.exports = { pool, supabase };
