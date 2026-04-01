const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgzqeusbpobrwanvktyz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnenFldXNicG9icndhbnZrdHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNDg2OTksImV4cCI6MjA4MTcyNDY5OX0.F5KRxRDsKT88mAIwFwBXJLaldt8l0lDCT-vs80aCZ40';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: dispositivos } = await supabase.from('dispositivos').select('id_dispositivo, nombre_dispositivo');
  const targetNames = [
    'fanzine', 'la gioconda', 'papeles', 'diseño', 'gunta', 'sashiko', 'tela colectiva'
  ];

  const targetIds = [];
  console.log("Devices matching:");
  dispositivos.forEach(d => {
    const name = d.nombre_dispositivo.toLowerCase();
    if (targetNames.some(t => name.includes(t))) {
      console.log(`- [${d.id_dispositivo}] ${d.nombre_dispositivo}`);
      targetIds.push(d.id_dispositivo);
    }
  });

  const { data: caps } = await supabase.rpc("rpc_obtener_vista_capacitados");
  const myCaps = (caps || []).filter(c => targetIds.includes(c.id_dispositivo) && c.estado_capacitacion === 'CAPACITADO');
  console.log(`\nFound ${myCaps.length} capacitados records for these devices.`);

  if (myCaps.length > 0) {
      console.log("Sample cap:", myCaps[0]);
  }

  const { data: calendar } = await supabase.from('calendario_dispositivos').select('*').in('id_dispositivo', targetIds).in('fecha', ['2026-04-03', '2026-04-04', '2026-04-05']).gt('cupo_objetivo', 0);
  console.log(`\nFound ${calendar.length} calendar entries with cupo > 0 for these devices on 03/04 - 05/04:`);
  console.log(calendar);
}
run();
