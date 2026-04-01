const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgzqeusbpobrwanvktyz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnenFldXNicG9icndhbnZrdHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNDg2OTksImV4cCI6MjA4MTcyNDY5OX0.F5KRxRDsKT88mAIwFwBXJLaldt8l0lDCT-vs80aCZ40';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runQuery() {
  const { data, error } = await supabase.rpc('rpc_obtener_vista_capacitados');
  const capMap = {};
  (data || []).forEach(row => {
    capMap[row.nombre_dispositivo] = (capMap[row.nombre_dispositivo] || 0) + 1;
  });
  console.log("Capacitaciones per device in RPC:");
  for (const [key, val] of Object.entries(capMap)) {
    console.log(`- ${key}: ${val}`);
  }
}
runQuery();
