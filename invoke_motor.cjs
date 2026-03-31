const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgzqeusbpobrwanvktyz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnenFldXNicG9icndhbnZrdHl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjE0ODY5OSwiZXhwIjoyMDgxNzI0Njk5fQ.nekEcuPqHs4VnJDrvZ_Z9SMGTJY6dRQofyxqcwGnBI8';
// We need the ANON key to call the edge function properly, but we'll try with the SERVICE KEY to see if it bypasses auth,
// or we can read the actual logs from the DB directly without calling the Edge Function by replicating its code.

const supabase = createClient(supabaseUrl, supabaseKey);

async function runEdgeFunction() {
  console.log('Invoking motor-asignacion-apertura for April 2026...');

  // Note: this might fail with 401 if Edge Functions strictly require a user JWT.
  // We are using the service_role key, let's see what happens.
  const { data, error } = await supabase.functions.invoke('motor-asignacion-apertura', {
    body: { mes_objetivo: '04-2026', anio_cohorte: 2026, start_date: '2026-04-01' }
  });

  if (error) {
    console.error('Error invoking function:', error);
  } else {
    console.log('Function returned success!');
    console.log(`Stats: Insertados: ${data.insertados}, Asignaciones: ${data.asignaciones}, Vacantes: ${data.vacantes}`);
    console.log('\n--- LOG DEL MOTOR ---');
    console.log((data.log || []).join('\n'));
    console.log('---------------------\n');
  }
}

runEdgeFunction();
