const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.dbthjqaiaargptyyomqk:pixo%40192848%23@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' });
async function run() {
  try {
    const { rows: r2 } = await pool.query(`
      SELECT COUNT(*), DATE_TRUNC('hour', created_at) as hour,
             COUNT(preview_data) as with_preview
      FROM shared_files 
      WHERE requester_user_id = (SELECT id FROM requester_users WHERE name ILIKE '%test2%' LIMIT 1)
         OR requester_user_id = (SELECT id FROM requester_users WHERE email_or_username ILIKE '%test2%' LIMIT 1)
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour DESC
    `);
    console.log('Upload batches:', r2);
    process.exit(0);
  } catch(e) { console.error(e); process.exit(1); }
}
run();
