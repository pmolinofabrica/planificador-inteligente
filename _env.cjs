const { readFileSync } = require("fs");
const { resolve } = require("path");

function loadDotEnv(file) {
  try {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
      const i = line.indexOf("=");
      const key = line.slice(0, i).trim();
      let value = line.slice(i + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Sin .env: se usan las variables de entorno ya definidas
  }
}

loadDotEnv(resolve(__dirname, "../../tunero/.env"));

const connectionString = process.env.SUPABASE_TRANSACTION_POOLER;
if (!connectionString) {
  console.error("Falta SUPABASE_TRANSACTION_POOLER en tunero/.env");
  process.exit(1);
}

module.exports = {
  connectionString,
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
};
