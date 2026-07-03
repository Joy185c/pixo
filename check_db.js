const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.dbthjqaiaargptyyomqk:pixo%40192848%23@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  const { rows } = await pool.query(`SELECT u.name, COUNT(f.id) FROM requester_users u JOIN shared_files f ON u.id = f.requester_user_id WHERE u.name ILIKE '%jannat%' GROUP BY u.name;`);
  console.log(rows);
  process.exit(0);
}

run().catch(console.error);
