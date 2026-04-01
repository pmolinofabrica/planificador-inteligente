const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.zgzqeusbpobrwanvktyz:UcA5EQxfEYd1Nb@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
});

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
