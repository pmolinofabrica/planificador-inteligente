const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgzqeusbpobrwanvktyz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnenFldXNicG9icndhbnZrdHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNDg2OTksImV4cCI6MjA4MTcyNDY5OX0.F5KRxRDsKT88mAIwFwBXJLaldt8l0lDCT-vs80aCZ40';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runQuery() {
  const { data, error } = await supabase
    .from('vista_agentes_capacitados')
    .select('id_agente, id_dispositivo, fecha_capacitacion')
    .limit(5);

  if (error) {
     console.error("View Error:", error);
  } else {
    console.log("vista_agentes_capacitados works:", data);
  }
}
runQuery();
