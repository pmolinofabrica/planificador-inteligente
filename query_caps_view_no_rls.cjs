const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.zgzqeusbpobrwanvktyz:UcA5EQxfEYd1Nb@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
});

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
