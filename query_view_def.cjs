const { Client } = require('pg');
const { connectionString } = require('./_env.cjs');

const client = new Client({ connectionString });

async function runPg() {
  await client.connect();

  try {
    const res = await client.query(`SELECT pg_get_viewdef('public.vista_agentes_capacitados', true) AS def;`);
    console.log("Current View Definition:\n", res.rows[0].def);

    const resRpc = await client.query(`
      SELECT pg_get_functiondef(p.oid) AS def
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname = 'rpc_obtener_vista_capacitados' AND n.nspname = 'public';
    `);
    console.log("Current RPC Definition:\n", resRpc.rows[0]?.def);

  } catch (err) {
    console.error("PG Error:", err.message);
  }

  await client.end();
}

runPg();
