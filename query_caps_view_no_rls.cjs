const { Client } = require('pg');
const { connectionString } = require('./_env.cjs');

const client = new Client({ connectionString });

async function runPg() {
  await client.connect();

  try {
    const res = await client.query("SELECT * FROM public.vista_agentes_capacitados LIMIT 5;");
    console.log("direct view query:", res.rows);
  } catch (err) {
    console.error("PG Error:", err.message);
  }

  await client.end();
}

runPg();
