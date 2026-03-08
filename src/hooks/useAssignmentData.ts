import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buildResidentCaps } from '@/lib/caps-builder';
import type {
  DeviceInfo, ResidentInfo, AssignmentEntry,
  AssignmentsMatrix, CalendarMatrix, ConvocadosMap, InasistenciasMap,
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
  const [tipoOrganizacionMap, setTipoOrganizacionMap] = useState<Record<string, string>>({});
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
      const { yFilt, mmFilt, startOfMonth, endOfMonth } = getMonthParts();

      const matchesTurnoFilter = (tipo: string): boolean => {
        const t = tipo.toLowerCase();
        if (turnoFilter === 'apertura') return t.includes('apertura');
        if (turnoFilter === 'tarde') return t.includes('turno tarde');
        if (turnoFilter === 'manana') return t.includes('turno mañana') || t.includes('turno manana');
        return t.includes('apertura');
      };

      try {
        // ═══════════════════════════════════════════════════════════
        // 1. DISPOSITIVOS
        // ═══════════════════════════════════════════════════════════
        const { data: dispoData } = await supabase
          .from('dispositivos')
          .select('id_dispositivo, nombre_dispositivo, piso_dispositivo, cupo_minimo, cupo_optimo')
          .eq('activo', true)
          .neq('id_dispositivo', 999)
          .order('piso_dispositivo', { ascending: true });

        const mapped = (dispoData || []).map(d => ({
          id: String(d.id_dispositivo),
          name: `(P${d.piso_dispositivo || '?'}) ${d.nombre_dispositivo}`,
          min: d.cupo_minimo || 1,
          max: d.cupo_optimo || 1,
          piso: d.piso_dispositivo || 0
        }));
        setDbDevices(mapped);

        // ═══════════════════════════════════════════════════════════
        // 2. RESIDENTES
        // ═══════════════════════════════════════════════════════════
        const { data: resiData } = await supabase
          .from('datos_personales')
          .select('id_agente, nombre, apellido, cohorte')
          .eq('activo', true)
          .eq('cohorte', 2026);

        if (resiData) setDbResidents(resiData);

        // ═══════════════════════════════════════════════════════════
        // 3. CAPACITACIONES — rebuilt from scratch
        // ═══════════════════════════════════════════════════════════
        // Filter convocatorias by year to avoid 1000-row Supabase limit
        const yearStart = `${yFilt}-01-01`;
        const yearEnd = `${yFilt}-12-31`;

        const [capsRep, partsRes, dispoCapsRes, convocadosMatrizRes, allPlanisRes, allDiasRes, allConvsRes] = await Promise.all([
          supabase.from('capacitaciones').select('id_cap, id_dia, id_turno, grupo'),
          supabase.from('capacitaciones_participantes').select('id_cap, id_agente, asistio').limit(5000),
          supabase.from('capacitaciones_dispositivos').select('id_cap, id_dispositivo').limit(5000),
          supabase.rpc('rpc_obtener_convocados_matriz', { anio_filtro: Number(yFilt) }),
          supabase.from('planificacion').select('id_plani, id_dia, id_turno, grupo').limit(5000),
          supabase.from('dias').select('id_dia, fecha').limit(5000),
          supabase.from('convocatoria').select('id_convocatoria, id_agente, id_plani')
            .eq('estado', 'vigente')
            .gte('fecha_convocatoria', yearStart)
            .lte('fecha_convocatoria', yearEnd)
            .limit(10000),
        ]);

        const capData = capsRep.data || [];
        const partsData = partsRes.data || [];
        const dispoCapData = dispoCapsRes.data || [];
        const convocadosMatriz = convocadosMatrizRes.data || [];
        const convsData = allConvsRes.data || [];
        const planisData = allPlanisRes.data || [];
        const diasData = allDiasRes.data || [];

        console.log(`[DataLoad] caps=${capData.length} parts=${partsData.length} capDispos=${dispoCapData.length} convocadosMatriz=${convocadosMatriz.length} planis=${planisData.length} dias=${diasData.length} residents=${resiData?.length || 0}`);

        // Build caps using clean builder
        if (resiData && resiData.length > 0) {
          const { residentsMap, agentGroups: groups } = buildResidentCaps({
            capData,
            partsData,
            dispoData: dispoCapData,
            diasData,
            resiData,
            convocadosMatriz,
          });
          setAgentGroups(groups);
          setAllResidentsDb(Object.values(residentsMap));
        }

        // ═══════════════════════════════════════════════════════════
        // 4. TURNOS LOOKUP
        // ═══════════════════════════════════════════════════════════
        const turnosLookupRes = await supabase.from('turnos').select('id_turno, tipo_turno');
        const turnoTypeMap: Record<number, string> = {};
        if (turnosLookupRes.data) {
          turnosLookupRes.data.forEach(t => { turnoTypeMap[t.id_turno] = t.tipo_turno; });
        }

        // ═══════════════════════════════════════════════════════════
        // 5. ASIGNACIONES (menu + menu_semana)
        // ═══════════════════════════════════════════════════════════
        const [menuRes, menuSemanaRes] = await Promise.all([
          supabase.from('menu')
            .select('id_agente, id_dispositivo, fecha_asignacion, estado_ejecucion, orden')
            .gte('fecha_asignacion', startOfMonth)
            .lte('fecha_asignacion', endOfMonth),
          supabase.from('menu_semana')
            .select('id_agente, id_dispositivo, fecha_asignacion, id_turno, numero_grupo, orden, estado_ejecucion, tipo_organizacion, id_convocatoria')
            .gte('fecha_asignacion', startOfMonth)
            .lte('fecha_asignacion', endOfMonth)
        ]);

        const menuData = menuRes.data || [];
        const menuSemanaData = menuSemanaRes.data || [];

        // Build numero_grupo + tipo_organizacion maps from menu_semana
        const grupoMap: Record<string, number | null> = {};
        const orgTypeMap: Record<string, string> = {};

        menuSemanaData.forEach(ms => {
          if (!ms.fecha_asignacion) return;
          const tipo = turnoTypeMap[ms.id_turno] || '';
          if (!matchesTurnoFilter(tipo)) return;
          const key = `${ms.id_agente}-${ms.fecha_asignacion}-${ms.id_dispositivo}`;
          grupoMap[key] = ms.numero_grupo;
          // Store tipo_organizacion per date (from menu_semana)
          const [fy, fm, fd] = ms.fecha_asignacion.split('-');
          if (fy === yFilt && fm === mmFilt) {
            const uiDate = `${fd}/${fm}`;
            if (ms.tipo_organizacion) orgTypeMap[uiDate] = ms.tipo_organizacion;
          }
        });
        setTipoOrganizacionMap(orgTypeMap);

        if (resiData) {
          const matrix: AssignmentsMatrix = {};
          const convocadosCount: Record<string, number> = {};
          const convocadosList: ConvocadosMap = {};
          const nameDict: Record<number, string> = {};
          resiData.forEach(r => nameDict[r.id_agente] = `${r.apellido} ${r.nombre}`);

          // For apertura: use `menu` table
          // For tarde/manana: use `menu_semana` table
          const isApertura = turnoFilter === 'apertura';

          if (isApertura) {
            menuData.forEach(a => {
              if (!a.fecha_asignacion) return;
              const [y, m, d] = a.fecha_asignacion.split("-");
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
                const grupoKey = `${a.id_agente}-${a.fecha_asignacion}-${a.id_dispositivo}`;
                matrix[uiDate][dId].push({
                  id: a.id_agente,
                  name: nameDict[a.id_agente] || "Desconocido",
                  score: a.orden || 1000,
                  numero_grupo: grupoMap[grupoKey] ?? null,
                });
              }
            });
          } else {
            // tarde/manana: build from menu_semana
            menuSemanaData.forEach(ms => {
              if (!ms.fecha_asignacion) return;
              const tipo = turnoTypeMap[ms.id_turno] || '';
              if (!matchesTurnoFilter(tipo)) return;
              const [y, m, d] = ms.fecha_asignacion.split("-");
              if (y !== yFilt || m !== mmFilt) return;
              const uiDate = `${d}/${m}`;

              if (!convocadosList[uiDate]) convocadosList[uiDate] = [];
              if (!convocadosList[uiDate].includes(ms.id_agente)) {
                convocadosList[uiDate].push(ms.id_agente);
                convocadosCount[uiDate] = (convocadosCount[uiDate] || 0) + 1;
              }

              if (ms.id_dispositivo && ms.id_dispositivo !== 999) {
                const dId = String(ms.id_dispositivo);
                if (!matrix[uiDate]) matrix[uiDate] = {};
                if (!matrix[uiDate][dId]) matrix[uiDate][dId] = [];
                matrix[uiDate][dId].push({
                  id: ms.id_agente,
                  name: nameDict[ms.id_agente] || "Desconocido",
                  score: ms.orden || 1000,
                  numero_grupo: ms.numero_grupo ?? null,
                });
              }
            });
          }

          // ═══════════════════════════════════════════════════════════
          // 6. CONVOCATORIA COMPLEMENTARIA
          // ═══════════════════════════════════════════════════════════
          try {
            const diasDict: Record<number, string> = {};
            diasData.forEach(dd => { if (dd.fecha) diasDict[dd.id_dia] = dd.fecha.substring(0, 10); });

            const planiToUiDate: Record<number, string> = {};
            const filteredPlaniIds: number[] = [];

            planisData.forEach(p => {
              const tipo = turnoTypeMap[p.id_turno] || '';
              if (!matchesTurnoFilter(tipo)) return;
              const fecha = diasDict[p.id_dia];
              if (!fecha) return;
              const [fy, fm, fd] = fecha.split('-');
              if (fy !== yFilt || fm !== mmFilt) return;
              const uiDate = `${fd}/${fm}`;
              planiToUiDate[p.id_plani] = uiDate;
              filteredPlaniIds.push(p.id_plani);
            });

            if (filteredPlaniIds.length > 0) {
              const matchingConvs = convsData.filter(c => filteredPlaniIds.includes(c.id_plani));
              const dateAgentConv: Record<string, Record<number, number>> = {};
              matchingConvs.forEach(c => {
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
          } catch (e) {
            console.error("Error cargando convocatoria:", e);
          }

          setConvocadosCountDb(convocadosCount);
          setConvocadosDb(convocadosList);

          // ═══════════════════════════════════════════════════════════
          // 7. CALENDARIO DISPOSITIVOS
          // ═══════════════════════════════════════════════════════════
          const newCalendarDb: CalendarMatrix = {};
          try {
            const { data: calData } = await supabase.from('calendario_dispositivos')
              .select('id_dispositivo, fecha, cupo_objetivo, id_turno')
              .gte('fecha', startOfMonth)
              .lte('fecha', endOfMonth);

            if (calData) {
              calData.forEach(row => {
                if (!row.fecha) return;
                const tipo = turnoTypeMap[row.id_turno] || '';
                if (!matchesTurnoFilter(tipo)) return;
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

          // ═══════════════════════════════════════════════════════════
          // 8. ACTIVE DATES (from planificación + menu_semana for non-apertura)
          // ═══════════════════════════════════════════════════════════
          const allActiveDates = new Set<string>();
          const turnoPerDate: Record<string, number> = {};

          const diasDict2: Record<number, string> = {};
          diasData.forEach(dd => { if (dd.fecha) diasDict2[dd.id_dia] = dd.fecha.substring(0, 10); });

          planisData.forEach(p => {
            const tipo = turnoTypeMap[p.id_turno] || '';
            if (!matchesTurnoFilter(tipo)) return;
            const fecha = diasDict2[p.id_dia];
            if (!fecha) return;
            const [fy, fm, fd] = fecha.split('-');
            if (fy !== yFilt || fm !== mmFilt) return;
            const uiDate = `${fd}/${fm}`;
            allActiveDates.add(uiDate);
            turnoPerDate[uiDate] = p.id_turno;
          });

          // Also add dates from menu_semana for non-apertura (in case no planificacion rows exist)
          if (!isApertura) {
            menuSemanaData.forEach(ms => {
              if (!ms.fecha_asignacion) return;
              const tipo = turnoTypeMap[ms.id_turno] || '';
              if (!matchesTurnoFilter(tipo)) return;
              const [fy, fm, fd] = ms.fecha_asignacion.split('-');
              if (fy !== yFilt || fm !== mmFilt) return;
              const uiDate = `${fd}/${fm}`;
              allActiveDates.add(uiDate);
              if (!turnoPerDate[uiDate]) turnoPerDate[uiDate] = ms.id_turno;
            });
          }
          setDateTurnoMap(turnoPerDate);

          // Filter matrix to valid dates
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

        // ═══════════════════════════════════════════════════════════
        // 9. INASISTENCIAS
        // ═══════════════════════════════════════════════════════════
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
  }, [selectedMonth, refreshCounter, getMonthParts, turnoFilter]);

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
    tipoOrganizacionMap, setTipoOrganizacionMap, turnoFilter,
    refresh, isAgentAbsent, getAbsenceMotivo, getMonthParts,
    setAssignmentsDb,
  };
}
