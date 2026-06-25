import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read .env from the tunero directory
const envPath = path.resolve(__dirname, '..', '..', '..', 'tunero', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

function parseEnv(content) {
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1);
    vars[key] = val;
  }
  return vars;
}

const env = parseEnv(envContent);
// Try pooler first (more reliable), fallback to direct
const connectionString = env.SUPABASE_TRANSACTION_POOLER || env.SUPABASE_DIRECT_CONNECTION;

if (!connectionString) {
  console.error('SUPABASE_DIRECT_CONNECTION not found in .env');
  process.exit(1);
}

// Read the migration SQL
const migrationPath = process.argv[2];
if (!migrationPath) {
  console.error('Usage: node scripts/apply_migration.mjs <path-to-migration.sql>');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(__dirname, '..', migrationPath), 'utf-8');
console.log(`Applying migration: ${migrationPath}`);

const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await pool.query(sql);
  console.log('Migration applied successfully.');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
