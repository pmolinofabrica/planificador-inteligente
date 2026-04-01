const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgzqeusbpobrwanvktyz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnenFldXNicG9icndhbnZrdHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNDg2OTksImV4cCI6MjA4MTcyNDY5OX0.F5KRxRDsKT88mAIwFwBXJLaldt8l0lDCT-vs80aCZ40';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runQuery() {
  const { data, error } = await supabase.rpc('rpc_obtener_vista_capacitados');
  if (error) {
     console.error(error);
  } else {
    console.log("Total capacitados RPC:", data.length);
    if(data.length > 0) {
      console.log("Sample:", data[0]);
    }
  }
}
runQuery();
