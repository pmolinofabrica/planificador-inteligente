import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  DeviceInfo, ResidentInfo, AssignmentEntry,
  AssignmentsMatrix, CalendarMatrix, ConvocadosMap, InasistenciasMap,
  MONTH_NAMES
} from '@/types/assignments';

interface UseAssignmentDataProps {
  selectedMonth: string;
  turnoFilter?: string;
}

export function useAssignmentData({ selectedMonth, turnoFilter = 'apertura' }: UseAssignmentDataProps) {
  const [dbDevices, setDbDevices] = useState<DeviceInfo[]>([]);
  const [dbResidents, setDbResidents] = useState<{ id_agente: number; nombre: string; apellido: string }[]>([]);
  const [allResidentsDb, setAllResidentsDb] = useState<ResidentInfo[]>([]);
  const [assignmentsDb, setAssignmentsDb] = useState<AssignmentsMatrix>({});
  const [agentGroups, setAgentGroups] = useState<Record<string, string>>({});
  const [calendarDb, setCalendarDb] = useState<CalendarMatrix>({});
  const [convocadosCountDb, setConvocadosCountDb] = useState<Record<string, number>>({});
  const [convocadosDb, setConvocadosDb] = useState<ConvocadosMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeDates, setActiveDates] = useState<string[]>([]);
  const [dateTurnoMap, setDateTurnoMap] = useState<Record<string, number>>({});
  const [inasistenciasDb, setInasistenciasDb] = useState<InasistenciasMap>({});
  const [agentConvocatoriaMap, setAgentConvocatoriaMap] = useState<Record<string, Record<number, number>>>({});
  const [refreshCounter, setRefreshCounter] = useState(0);

  const refresh = useCallback(() => setRefreshCounter(c => c + 1), []);

  const getMonthParts = useCallback(() => {
    const smParts = (selectedMonth || "Marzo 2026").split(" ");
    const yFilt = smParts[1] || "2026";
    const monthNames: Record<string, string> = {
      "Enero": "01", "Febrero": "02", "Marzo": "03", "Abril": "04",
      "Mayo": "05", "Junio": "06", "Julio": "07", "Agosto": "08",
      "Septiembre": "09", "Octubre": "10", "Noviembre": "11", "Diciembre": "12"
    };
    const mmFilt = monthNames[smParts[0]] || "03";
    const startOfMonth = `${yFilt}-${mmFilt}-01`;
    const lastDay = new Date(Number(yFilt), Number(mmFilt), 0).getDate();
    const endOfMonth = `${yFilt}-${mmFilt}-${lastDay}`;
    return { yFilt, mmFilt, startOfMonth, endOfMonth };
  }, [selectedMonth]);

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      let residentsMap: Record<number, ResidentInfo> = {};
      const { yFilt, mmFilt, startOfMonth, endOfMonth } = getMonthParts();

      try {
        // Fetch Dispositivos
        const { data: dispoData } = await supabase
          .from('dispositivos')
          .select('id_dispositivo, nombre_dispositivo, piso_dispositivo, cupo_minimo, cupo_optimo')
          .eq('activo', true)
          .neq('id_dispositivo', 999)
          .order('piso_dispositivo', { ascending: true });

        if (dispoData && dispoData.length > 0) {
          const mapped = dispoData.map(d => ({
            id: String(d.id_dispositivo),
            name: `(P${d.piso_dispositivo || '?'}) ${d.nombre_dispositivo}`,
            min: d.cupo_minimo || 1,
            max: d.cupo_optimo || 1,
            piso: d.piso_dispositivo || 0
          }));
          setDbDevices(mapped);
        }

        // Fetch Residentes
        const { data: resiData } = await supabase
          .from('datos_personales')
          .select('id_agente, nombre, apellido, cohorte')
          .eq('activo', true)
          .eq('cohorte', 2026);

        if (resiData) setDbResidents(resiData);

        // Fetch capacitaciones
        const capsRep = await supabase.from('capacitaciones').select('id_cap, id_dia, id_turno, grupo');
        const capData = capsRep.data || [];
        const diaIds = Array.from(new Set(capData.map(c => c.id_dia).filter(Boolean)));

        const [partsRes, dispoCapsRes, diasRes, convsRes, planisRes] = await Promise.all([
          supabase.from('capacitaciones_participantes').select('id_cap, id_agente, asistio').limit(4000),
          supabase.from('capacitaciones_dispositivos').select('id_cap, id_dispositivo').limit(2000),
          supabase.from('dias').select('id_dia, fecha').in('id_dia', diaIds),
          supabase.from('convocatoria').select('id_convocatoria, id_agente, id_plani').eq('estado', 'vigente'),
          supabase.from('planificacion').select('id_plani, id_dia, id_turno, grupo')
        ]);

        if (resiData && capData.length && partsRes.data && dispoCapsRes.data && diasRes.data && convsRes.data && planisRes.data) {
          const diasDict: Record<number, string> = {};
          diasRes.data.forEach(d => { if (d.fecha) diasDict[d.id_dia] = d.fecha.substring(0, 10); });

          const capDates: Record<number, string> = {};
          const capGroups: Record<number, string> = {};
          const planiToCap: Record<number, number> = {};

          capData.forEach(c => {
            const realDate = diasDict[c.id_dia];
            if (realDate) capDates[c.id_cap] = realDate;
            if (c.grupo) capGroups[c.id_cap] = c.grupo;
            const matchPlani = planisRes.data!.find(p => 
              p.id_dia === c.id_dia && p.id_turno === c.id_turno && 
              ((p.grupo || null) === (c.grupo || null))
            );
            if (matchPlani) planiToCap[matchPlani.id_plani] = c.id_cap;
          });

          const capDispos: Record<number, number[]> = {};
          dispoCapsRes.data.forEach(cd => {
            if (!capDispos[cd.id_cap]) capDispos[cd.id_cap] = [];
            capDispos[cd.id_cap].push(cd.id_dispositivo);
          });

          resiData.forEach(r => {
            residentsMap[r.id_agente] = {
              id: r.id_agente,
              name: `${r.apellido} ${r.nombre}`,
              caps: {}
            };
          });

          const vetoedMap: Record<string, Set<number>> = {};
          partsRes.data.forEach(p => {
            if (p.asistio === false) {
              const agId = String(p.id_agente);
              if (!vetoedMap[agId]) vetoedMap[agId] = new Set();
              vetoedMap[agId].add(p.id_cap);
            }
          });

          const gruposAgenteMap: Record<string, Set<string>> = {};
          partsRes.data.forEach(p => {
            if (p.asistio !== true) return;
            const agId = String(p.id_agente);
            const cId = p.id_cap;
            const cDate = capDates[cId];
            const dispos = capDispos[cId] || [];
            if (capGroups[cId]) {
              if (!gruposAgenteMap[agId]) gruposAgenteMap[agId] = new Set();
              gruposAgenteMap[agId].add(capGroups[cId]);
            }
            if (residentsMap[p.id_agente] && cDate) {
              dispos.forEach(dId => {
                const dKey = String(dId);
                if (!residentsMap[p.id_agente].caps[dKey] || cDate < residentsMap[p.id_agente].caps[dKey]) {
                  residentsMap[p.id_agente].caps[dKey] = cDate;
                }
              });
            }
          });

          convsRes.data.forEach(cv => {
            const agId = String(cv.id_agente);
            const cId = planiToCap[cv.id_plani];
            if (!cId) return;
            if (vetoedMap[agId]?.has(cId)) return;
            const cDate = capDates[cId];
            const dispos = capDispos[cId] || [];
            if (capGroups[cId]) {
              if (!gruposAgenteMap[agId]) gruposAgenteMap[agId] = new Set();
              gruposAgenteMap[agId].add(capGroups[cId]);
            }
            if (residentsMap[cv.id_agente] && cDate) {
              dispos.forEach(dId => {
                const dKey = String(dId);
                if (!residentsMap[cv.id_agente].caps[dKey]) {
                  residentsMap[cv.id_agente].caps[dKey] = cDate;
                }
              });
            }
          });

          const gruposAgenteFinal: Record<string, string> = {};
          Object.keys(gruposAgenteMap).forEach(k => {
            const grps = Array.from(gruposAgenteMap[k]);
            gruposAgenteFinal[k] = grps.includes('A') ? 'A' : grps[0];
          });
          setAgentGroups(gruposAgenteFinal);
          setAllResidentsDb(Object.values(residentsMap));
        }

        // Fetch Asignaciones (menu table)
        const [menuRes, menuSemanaRes] = await Promise.all([
          supabase.from('menu')
            .select('id_agente, id_dispositivo, fecha_asignacion, estado_ejecucion, orden')
            .gte('fecha_asignacion', startOfMonth)
            .lte('fecha_asignacion', endOfMonth),
          supabase.from('menu_semana')
            .select('id_agente, id_dispositivo, fecha_asignacion, id_turno, numero_grupo, orden, estado_ejecucion')
            .gte('fecha_asignacion', startOfMonth)
            .lte('fecha_asignacion', endOfMonth)
        ]);

        const menuData = menuRes.data;
        const menuSemanaData = menuSemanaRes.data;

        // Build turno type lookup for menu_semana filtering
        const turnosLookupRes = await supabase.from('turnos').select('id_turno, tipo_turno');
        const turnoTypeMap: Record<number, string> = {};
        if (turnosLookupRes.data) {
          turnosLookupRes.data.forEach(t => { turnoTypeMap[t.id_turno] = t.tipo_turno; });
        }

        // Build numero_grupo map from menu_semana (keyed by "agentId-fecha-dispositivoId")
        const grupoMap: Record<string, number | null> = {};
        if (menuSemanaData) {
          menuSemanaData.forEach(ms => {
            if (!ms.fecha_asignacion) return;
            // Only include apertura turno records
            const tipo = (turnoTypeMap[ms.id_turno] || '').toLowerCase();
            if (!tipo.includes('apertura')) return;
            const key = `${ms.id_agente}-${ms.fecha_asignacion}-${ms.id_dispositivo}`;
            grupoMap[key] = ms.numero_grupo;
          });
        }

        if (menuData && resiData) {
          const matrix: AssignmentsMatrix = {};
          const convocadosCount: Record<string, number> = {};
          const convocadosList: ConvocadosMap = {};
          const nameDict: Record<number, string> = {};
          resiData.forEach(r => nameDict[r.id_agente] = `${r.apellido} ${r.nombre}`);

          menuData.forEach(a => {
            if (!a.fecha_asignacion) return;
            const dateParts = a.fecha_asignacion.split("-");
            if (dateParts.length !== 3) return;
            const [y, m, d] = dateParts;
            if (y !== yFilt || m !== mmFilt) return;
            const uiDate = `${d}/${m}`;

            if (!convocadosList[uiDate]) convocadosList[uiDate] = [];
            if (!convocadosList[uiDate].includes(a.id_agente)) {
              convocadosList[uiDate].push(a.id_agente);
              convocadosCount[uiDate] = (convocadosCount[uiDate] || 0) + 1;
            }

            if (a.id_dispositivo && a.id_dispositivo !== 999) {
              const dId = String(a.id_dispositivo);
              if (!matrix[uiDate]) matrix[uiDate] = {};
              if (!matrix[uiDate][dId]) matrix[uiDate][dId] = [];
              // Lookup numero_grupo from menu_semana
              const grupoKey = `${a.id_agente}-${a.fecha_asignacion}-${a.id_dispositivo}`;
              matrix[uiDate][dId].push({
                id: a.id_agente,
                name: nameDict[a.id_agente] || "Desconocido",
                score: a.orden || 1000,
                numero_grupo: grupoMap[grupoKey] ?? null,
              });
            }
          });

          // Convocatoria complementaria
          try {
            const [planiConv, turnosConv, diasConv] = await Promise.all([
              supabase.from('planificacion').select('id_plani, id_dia, id_turno'),
              supabase.from('turnos').select('id_turno, tipo_turno'),
              supabase.from('dias').select('id_dia, fecha')
            ]);

            if (planiConv.data && turnosConv.data && diasConv.data) {
              const tDict: Record<number, string> = {};
              turnosConv.data.forEach(t => { tDict[t.id_turno] = t.tipo_turno; });
              const dMap: Record<number, string> = {};
              diasConv.data.forEach(d => { if (d.fecha) dMap[d.id_dia] = d.fecha.substring(0, 10); });

              const planiToUiDate: Record<number, string> = {};
              const aperturaPlaniIds: number[] = [];

              planiConv.data.forEach(p => {
                const tipo = (tDict[p.id_turno] || '').toLowerCase();
                if (!tipo.includes('apertura')) return;
                const fecha = dMap[p.id_dia];
                if (!fecha) return;
                const [fy, fm, fd] = fecha.split('-');
                if (fy !== yFilt || fm !== mmFilt) return;
                const uiDate = `${fd}/${fm}`;
                planiToUiDate[p.id_plani] = uiDate;
                aperturaPlaniIds.push(p.id_plani);
              });

              if (aperturaPlaniIds.length > 0) {
                const { data: convData } = await supabase
                  .from('convocatoria')
                  .select('id_convocatoria, id_plani, id_agente')
                  .eq('estado', 'vigente')
                  .in('id_plani', aperturaPlaniIds);

                if (convData) {
                  const dateAgentConv: Record<string, Record<number, number>> = {};
                  convData.forEach(c => {
                    const uiDate = planiToUiDate[c.id_plani];
                    if (!uiDate) return;
                    if (!dateAgentConv[uiDate]) dateAgentConv[uiDate] = {};
                    dateAgentConv[uiDate][c.id_agente] = c.id_convocatoria;
                    if (!convocadosList[uiDate]) convocadosList[uiDate] = [];
                    if (!convocadosList[uiDate].includes(c.id_agente)) {
                      convocadosList[uiDate].push(c.id_agente);
                      convocadosCount[uiDate] = (convocadosCount[uiDate] || 0) + 1;
                    }
                  });
                  setAgentConvocatoriaMap(dateAgentConv);
                }
              }
            }
          } catch (e) {
            console.error("Error cargando convocatoria:", e);
          }

          setConvocadosCountDb(convocadosCount);
          setConvocadosDb(convocadosList);

          // Calendario de dispositivos
          const newCalendarDb: CalendarMatrix = {};
          try {
            const { data: calData } = await supabase.from('calendario_dispositivos')
              .select('id_dispositivo, fecha, cupo_objetivo, id_turno')
              .gte('fecha', startOfMonth)
              .lte('fecha', endOfMonth);
            const { data: turnosCal } = await supabase.from('turnos').select('id_turno, tipo_turno');
            const calTurnoDict: Record<number, string> = {};
            if (turnosCal) turnosCal.forEach(t => { calTurnoDict[t.id_turno] = t.tipo_turno; });

            if (calData) {
              calData.forEach(row => {
                if (!row.fecha) return;
                const tipo = (calTurnoDict[row.id_turno] || '').toLowerCase();
                if (!tipo.includes('apertura')) return;
                const [fy, fm, fd] = row.fecha.substring(0, 10).split('-');
                const uiDate = `${fd}/${fm}`;
                if (!newCalendarDb[uiDate]) newCalendarDb[uiDate] = {};
                newCalendarDb[uiDate][String(row.id_dispositivo)] = row.cupo_objetivo || 0;
              });
            }
          } catch (e) {
            console.error("Error cupos:", e);
          }

          Object.keys(matrix).forEach(uid => {
            if (!newCalendarDb[uid]) newCalendarDb[uid] = {};
            Object.keys(matrix[uid]).forEach(did => {
              if (newCalendarDb[uid][did] === undefined) {
                newCalendarDb[uid][did] = matrix[uid][did].length;
              }
            });
          });
          setCalendarDb(newCalendarDb);

          // Active dates from planificacion
          const allActiveDates = new Set<string>();
          const turnoPerDate: Record<string, number> = {};
          try {
            const [planiRes, turnosRes, allDiasRes] = await Promise.all([
              supabase.from('planificacion').select('id_dia, id_turno'),
              supabase.from('turnos').select('id_turno, tipo_turno'),
              supabase.from('dias').select('id_dia, fecha')
            ]);
            if (planiRes.data && turnosRes.data && allDiasRes.data) {
              const turnoDict: Record<number, string> = {};
              turnosRes.data.forEach(t => { turnoDict[t.id_turno] = t.tipo_turno; });
              const dDict: Record<number, string> = {};
              allDiasRes.data.forEach(d => { if (d.fecha) dDict[d.id_dia] = d.fecha.substring(0, 10); });

              planiRes.data.forEach(p => {
                const tipo = (turnoDict[p.id_turno] || '').toLowerCase();
                if (!tipo.includes('apertura')) return;
                const fecha = dDict[p.id_dia];
                if (!fecha) return;
                const [fy, fm, fd] = fecha.split('-');
                if (fy !== yFilt || fm !== mmFilt) return;
                const uiDate = `${fd}/${fm}`;
                allActiveDates.add(uiDate);
                turnoPerDate[uiDate] = p.id_turno;
              });
              setDateTurnoMap(turnoPerDate);
            }
          } catch (e) {
            console.error("Error planificacion:", e);
          }

          // Filter matrix
          const validDates = Array.from(allActiveDates);
          Object.keys(matrix).forEach(uid => {
            if (!validDates.includes(uid)) delete matrix[uid];
          });
          setAssignmentsDb(matrix);

          const sorted = Array.from(allActiveDates).sort((a, b) => {
            const [dayA, monthA] = a.split("/").map(Number);
            const [dayB, monthB] = b.split("/").map(Number);
            return monthA !== monthB ? monthA - monthB : dayA - dayB;
          });
          setActiveDates(sorted);
        }

        // Inasistencias
        try {
          const { data: inasData } = await supabase
            .from('inasistencias')
            .select('id_agente, fecha_inasistencia, motivo');
          if (inasData) {
            const inasMap: InasistenciasMap = {};
            inasData.forEach(row => {
              if (!row.fecha_inasistencia) return;
              const parts = row.fecha_inasistencia.split('-');
              if (parts.length === 3) {
                const uiDate = `${parts[2]}/${parts[1]}`;
                if (!inasMap[uiDate]) inasMap[uiDate] = [];
                if (!inasMap[uiDate].some(x => x.id_agente === row.id_agente)) {
                  inasMap[uiDate].push({ id_agente: row.id_agente, motivo: row.motivo || 'otro' });
                }
              }
            });
            setInasistenciasDb(inasMap);
          }
        } catch (e) {
          console.error('Error inasistencias:', e);
        }

      } catch (err) {
        console.error("Error loading Supabase:", err);
      }
      setIsLoading(false);
    }

    loadInitialData();
  }, [selectedMonth, refreshCounter, getMonthParts]);

  const isAgentAbsent = useCallback((agentId: number, uiDate: string): boolean => {
    return (inasistenciasDb[uiDate] || []).some(x => x.id_agente === agentId);
  }, [inasistenciasDb]);

  const getAbsenceMotivo = useCallback((agentId: number, uiDate: string): string => {
    const found = (inasistenciasDb[uiDate] || []).find(x => x.id_agente === agentId);
    return found?.motivo || '';
  }, [inasistenciasDb]);

  return {
    dbDevices, dbResidents, allResidentsDb, assignmentsDb,
    agentGroups, calendarDb, setCalendarDb, convocadosCountDb,
    convocadosDb, isLoading, setIsLoading, activeDates,
    dateTurnoMap, inasistenciasDb, agentConvocatoriaMap,
    refresh, isAgentAbsent, getAbsenceMotivo, getMonthParts,
    setAssignmentsDb,
  };
}
