const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.dbthjqaiaargptyyomqk:pixo%40192848%23@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' });
async function run() {
  try {
    // Check if preview_data exists and has data for Doraemon
    const { rows: r1 } = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(preview_data) as with_preview,
        COUNT(thumbnail_url) as with_thumb
      FROM shared_files 
      WHERE requester_user_id = (SELECT id FROM requester_users WHERE name ILIKE '%doraemon%' LIMIT 1)
    `);
    console.log('Doraemon file stats:', r1[0]);

    // Check one sample file
    const { rows: r2 } = await pool.query(`
      SELECT file_token, file_name, category,
             CASE WHEN preview_data IS NOT NULL THEN 'HAS_PREVIEW' ELSE 'NULL' END as preview_status,
             CASE WHEN thumbnail_url IS NOT NULL THEN thumbnail_url ELSE 'NULL' END as thumb_url
      FROM shared_files 
      WHERE requester_user_id = (SELECT id FROM requester_users WHERE name ILIKE '%doraemon%' LIMIT 1)
      LIMIT 5
    `);
    console.log('Sample files:', r2);
    process.exit(0);
  } catch(e) { console.error(e); process.exit(1); }
}
run();
