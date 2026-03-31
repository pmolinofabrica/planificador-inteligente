const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.zgzqeusbpobrwanvktyz:UcA5EQxfEYd1Nb@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
});

async function runPg() {
  await client.connect();

  const sql = `
    CREATE TABLE IF NOT EXISTS public.auditoria_calendario (
        id SERIAL PRIMARY KEY,
        fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        operacion VARCHAR(10) NOT NULL,
        usuario_db VARCHAR(50),
        esquema_tabla VARCHAR(50),
        nombre_tabla VARCHAR(50),
        registro_id VARCHAR(100),
        datos_anteriores JSONB,
        datos_nuevos JSONB
    );

    GRANT ALL ON public.auditoria_calendario TO postgres, anon, authenticated, service_role;
  `;

  try {
    await client.query(sql);
    console.log("Audit table created successfully!");
  } catch (err) {
    console.error("Error creating audit table:", err.message);
  }

  await client.end();
}

runPg();
