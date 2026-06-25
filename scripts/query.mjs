import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.resolve(__dirname, '..', '..', '..', 'tunero', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
function parseEnv(content) {
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    vars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }
  return vars;
}
const env = parseEnv(envContent);
const connectionString = env.SUPABASE_TRANSACTION_POOLER || env.SUPABASE_DIRECT_CONNECTION;

const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  const sql = process.argv.slice(2).join(' ');
  if (!sql) { console.error('Usage: node scripts/query.mjs <SQL>'); process.exit(1); }
  const result = await pool.query(sql);
  console.log(JSON.stringify(result.rows, null, 2));
} catch (err) {
  console.error('Query error:', err.message);
} finally {
  await pool.end();
}
