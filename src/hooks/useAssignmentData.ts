import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentSchoolYearMonth } from '@/utils/dateUtils';
import { buildResidentCaps } from '@/lib/caps-builder';
import { getActiveCohorteSync } from '@/hooks/useConfig';
import type {
  DeviceInfo, ResidentInfo, AssignmentEntry,
  AssignmentsMatrix, CalendarMatrix, ConvocadosMap, InasistenciasMap,
  VisitaInfo, VisitasByDateMap, AnnualMetricsMap, AgentAnnualMetrics,
  PendingMutation,
} from '@/types/assignments';

interface UseAssignmentDataProps {
  selectedMonth: string;
  turnoFilter?: string;
}

interface StaticCache {
  resiData: any[] | null;
  capData: any[];
  partsData: any[];
  dispoCapData: any[];
  convocadosMatriz: any[];
  planisData: any[];
  diasData: any[];
  inasistenciasRaw: any[];
  turnoTypeMap: Record<number, string>;
}

const DRAFT_AUDIT_ENABLED = true;

const buildMutationKey = (m: PendingMutation) => {
  const agentId = m.matchParams?.id_agente ?? m.payload?.id_agente ?? 'na';
  const fecha = m.matchParams?.fecha_asignacion ?? m.payload?.fecha_asignacion ?? 'na';
  const turno = m.matchParams?.id_turno ?? m.payload?.id_turno ?? 'na';
  return `${m.table}:${agentId}:${fecha}:${turno}`;
};

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
  const [agentConvocatoriaStatusMap, setAgentConvocatoriaStatusMap] = useState<Record<string, Record<number, string>>>({});
  const [tipoOrganizacionMap, setTipoOrganizacionMap] = useState<Record<string, string>>({});
  const [visitasByDate, setVisitasByDate] = useState<VisitasByDateMap>({});
  const [annualMetricsDb, setAnnualMetricsDb] = useState<AnnualMetricsMap>({});
  const [aperturaMetricsDb, setAperturaMetricsDb] = useState<AnnualMetricsMap>({});
  const [tardeMananaMetricsDb, setTardeMananaMetricsDb] = useState<AnnualMetricsMap>({});
  const [acompanaMetricsDb, setAcompanaMetricsDb] = useState<Record<number, number>>({});
  const [refreshCounter, setRefreshCounter] = useState(0);

  const [pendingMutations, setPendingMutations] = useState<PendingMutation[]>([]);
  const hasLoadedStatic = useRef(false);
  const staticCache = useRef<StaticCache | null>(null);

  const addAssignmentDraft = useCallback((mutation: PendingMutation) => {
    const uiDate = mutation.uiDate;
    if (!uiDate) {
      console.warn("addAssignmentDraft: uiDate is missing in mutation", mutation);
      return;
    }
    
    setPendingMutations(prev => {
      // Intentamos encontrar una mutación previa para el mismo "espacio lógico"
      // Para menu/menu_semana el espacio es (tabla, agente, fecha, turno)
      const isAssignment = mutation.table === 'menu' || mutation.table === 'menu_semana';
      const isRotationMultiDevice =
        mutation.table === 'menu_semana' &&
        (
          String(mutation.payload?.tipo_organizacion || '').toLowerCase().includes('rotacion') ||
          // Si matchParams tiene un id_dispositivo real (!=999), la operación es específica de ese
          // dispositivo — esto aplica tanto a asignaciones como a quitadas en modo rotación.
          (mutation.matchParams?.id_dispositivo != null && mutation.matchParams?.id_dispositivo !== 999)
        );
      let existingIndex = -1;

      if (isAssignment && mutation.matchParams?.id_agente) {
        existingIndex = prev.findIndex(m => 
          m.table === mutation.table && 
          m.matchParams?.id_agente === mutation.matchParams.id_agente &&
          m.matchParams?.fecha_asignacion === mutation.matchParams.fecha_asignacion &&
          m.matchParams?.id_turno === mutation.matchParams.id_turno &&
          (
            !isRotationMultiDevice ||
            m.matchParams?.id_dispositivo === mutation.matchParams?.id_dispositivo
          )
        );
      } else {
        existingIndex = prev.findIndex(m => m.id === mutation.id);
      }

      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        const next = [...prev];

        // Lógica de mezcla simplificada:
        // Si el nuevo es un 'remove' (dispositivo 999) y el anterior era un 'insert', simplemente eliminamos ambos
        if (mutation.payload?.id_dispositivo === 999 && existing.action === 'insert') {
          next.splice(existingIndex, 1);
          if (DRAFT_AUDIT_ENABLED) {
            console.info('[DraftAudit] merge-cancel', {
              key: buildMutationKey(mutation),
              removedExistingId: existing.id,
              incomingId: mutation.id,
            });
          }
          return next;
        }

        // De lo contrario, el nuevo sobreescribe al viejo (manteniendo la acción original si era insert)
        next[existingIndex] = {
          ...mutation,
          action: existing.action === 'insert' ? 'insert' : mutation.action
        };
        if (DRAFT_AUDIT_ENABLED) {
          console.info('[DraftAudit] merge-replace', {
            key: buildMutationKey(mutation),
            replacedId: existing.id,
            incomingId: mutation.id,
            finalAction: next[existingIndex].action,
          });
        }
        return next;
      }

      if (DRAFT_AUDIT_ENABLED) {
        console.info('[DraftAudit] enqueue', {
          id: mutation.id,
          key: buildMutationKey(mutation),
          table: mutation.table,
          action: mutation.action,
          uiDate: mutation.uiDate,
          matchParams: mutation.matchParams,
          payload: mutation.payload,
        });
      }
      return [...prev, mutation];
    });

    // Actualización inmediata del estado local para la UI
    if (mutation.table === 'menu' || mutation.table === 'menu_semana') {
      const agentId = mutation.matchParams?.id_agente || mutation.payload?.id_agente;
      const targetDispId = mutation.payload?.id_dispositivo;
      const uiName = mutation.payload?._ui_name;

      if (agentId) {
        const isRotationMultiDevice =
          mutation.table === 'menu_semana' &&
          (
            String(mutation.payload?.tipo_organizacion || '').toLowerCase().includes('rotacion') ||
            // Si matchParams tiene un id_dispositivo real (!=999), la operación es específica de ese
            // dispositivo — esto aplica tanto a asignaciones como a quitadas en modo rotación.
            (mutation.matchParams?.id_dispositivo != null && mutation.matchParams?.id_dispositivo !== 999)
          );
        setAssignmentsDb(prev => {
          const next = { ...prev };
          if (!next[uiDate]) next[uiDate] = {};
          let existingName: string | undefined;
          let existingScore: number | undefined;
          let existingGroup: number | null | undefined;
          let existingAcompana: boolean | undefined;
          
          if (!isRotationMultiDevice) {
            // Apertura/dispositivos fijos: un agente solo puede estar en un dispositivo por fecha.
            Object.keys(next[uiDate]).forEach(dId => {
              const found = next[uiDate][dId].find(a => a.id === agentId);
              if (found) {
                existingName = found.name;
                existingScore = found.score;
                existingGroup = found.numero_grupo ?? null;
                existingAcompana = found.acompana_grupo;
              }
              next[uiDate][dId] = next[uiDate][dId].filter(a => a.id !== agentId);
            });
          } else {
            // Rotación: preservamos ubicaciones previas en otros dispositivos.
            Object.keys(next[uiDate]).forEach(dId => {
              const found = next[uiDate][dId].find(a => a.id === agentId);
              if (found) {
                existingName = found.name;
                existingScore = found.score;
                existingGroup = found.numero_grupo ?? null;
                existingAcompana = found.acompana_grupo;
              }
            });
          }

          // Si el destino no es 999, lo agregamos al nuevo dispositivo
          if (targetDispId && targetDispId !== 999) {
            const dIdStr = String(targetDispId);
            if (!next[uiDate][dIdStr]) next[uiDate][dIdStr] = [];
            next[uiDate][dIdStr] = [
              ...next[uiDate][dIdStr].filter(a => a.id !== agentId),
              {
                id: agentId, 
                name: uiName || existingName || "Cargando...",
                score: existingScore ?? 0,
                numero_grupo: mutation.payload?.numero_grupo ?? existingGroup ?? null,
                acompana_grupo: mutation.payload?.acompana_grupo ?? existingAcompana ?? false,
                _isDraft: true,
              }
            ];
          } else if (isRotationMultiDevice && mutation.matchParams?.id_dispositivo) {
            // En rotación, al "quitar" quitamos sólo del dispositivo objetivo, no de todos.
            const srcId = String(mutation.matchParams.id_dispositivo);
            if (next[uiDate][srcId]) {
              next[uiDate][srcId] = next[uiDate][srcId].filter(a => a.id !== agentId);
            }
          }
          return next;
        });
      }
    } else if (mutation.table === 'calendario_dispositivos') {
      const { id_dispositivo, cupo_objetivo } = mutation.payload;
      if (id_dispositivo != null && cupo_objetivo != null) {
        setCalendarDb(prev => ({
          ...prev,
          [uiDate]: {
            ...(prev[uiDate] || {}),
            [String(id_dispositivo)]: cupo_objetivo
          }
        }));
      }
    }
  }, []);

  const removeAssignmentDraft = useCallback((mutation: PendingMutation) => {
     addAssignmentDraft(mutation);
  }, [addAssignmentDraft]);

  const saveDrafts = async () => {
    if (pendingMutations.length === 0) return { success: true };
    setIsLoading(true);
    try {
      const persistMenuLike = async (
        table: 'menu' | 'menu_semana',
        action: MutationAction,
        cleanPayload: any,
        cleanMatchParams: any
      ) => {
        const resolveConvocatoriaId = async (agentId: number, fecha: string, turnoId?: number) => {
          const { data: diaData, error: diaErr } = await supabase
            .from('dias')
            .select('id_dia')
            .eq('fecha', fecha)
            .maybeSingle();
          if (diaErr || !diaData?.id_dia) return null;

          let q = supabase
            .from('convocatoria')
            .select('id_convocatoria, planificacion!inner(id_dia, id_turno)')
            .eq('id_agente', agentId)
            .eq('estado', 'vigente')
            .eq('planificacion.id_dia', diaData.id_dia);

          if (turnoId != null) q = q.eq('planificacion.id_turno', turnoId);
          const { data: convRows } = await q.limit(1);
          return convRows?.[0]?.id_convocatoria ?? null;
        };

        const isMenuSemanaMultiDevice =
          table === 'menu_semana' &&
          (
            String(cleanPayload?.tipo_organizacion || '').toLowerCase().includes('rotacion') ||
            (cleanMatchParams?.id_dispositivo != null && cleanMatchParams?.id_dispositivo !== 999 && cleanPayload?.id_dispositivo !== 999)
          );

        const keyFields = table === 'menu_semana'
          ? (isMenuSemanaMultiDevice
            ? (['id_agente', 'fecha_asignacion', 'id_turno', 'id_dispositivo'] as const)
            : (['id_agente', 'fecha_asignacion', 'id_turno'] as const))
          : (['id_agente', 'fecha_asignacion'] as const);

        const logicalKey: Record<string, any> = {};
        keyFields.forEach((k) => {
          const v = cleanPayload?.[k] ?? cleanMatchParams?.[k];
          if (v !== undefined && v !== null) logicalKey[k] = v;
        });

        if (Object.keys(logicalKey).length !== keyFields.length && cleanMatchParams?.id_menu_semana && table === 'menu_semana') {
          const { data: byId, error: byIdErr } = await supabase
            .from('menu_semana')
            .select('id_agente, fecha_asignacion, id_turno')
            .eq('id_menu_semana', cleanMatchParams.id_menu_semana)
            .maybeSingle();
          if (byIdErr) throw new Error(`[${table}] Resolve key failed: ${byIdErr.message}`);
          if (byId) {
            logicalKey.id_agente = byId.id_agente;
            logicalKey.fecha_asignacion = byId.fecha_asignacion;
            logicalKey.id_turno = byId.id_turno;
          }
        }

        if (Object.keys(logicalKey).length !== keyFields.length) {
          let fallbackQ: any = action === 'delete' ? supabase.from(table).delete() : supabase.from(table).update(cleanPayload);
          for (const [k, v] of Object.entries(cleanMatchParams || {})) fallbackQ = fallbackQ.eq(k, v);
          const { error } = await fallbackQ;
          if (error) throw new Error(`[${table}] Fallback failed: ${error.message}`);
          return;
        }

        if (action === 'delete') {
          let delQ: any = supabase.from(table).delete();
          for (const [k, v] of Object.entries(logicalKey)) delQ = delQ.eq(k, v);
          const { error } = await delQ;
          if (error) throw new Error(`[${table}] Delete failed: ${error.message}`);
          return;
        }

        let existingQ: any = supabase.from(table).select('*');
        for (const [k, v] of Object.entries(logicalKey)) existingQ = existingQ.eq(k, v);
        const { data: existingRows, error: existingErr } = await existingQ;
        if (existingErr) throw new Error(`[${table}] Read failed: ${existingErr.message}`);

        const baseRow = (existingRows && existingRows.length > 0) ? existingRows[0] : {};
        const finalRow = { ...baseRow, ...cleanPayload, ...logicalKey };
        delete finalRow.id_menu_semana;

        if (table === 'menu_semana' && (finalRow.id_convocatoria == null)) {
          const resolvedConvId = await resolveConvocatoriaId(
            Number(finalRow.id_agente),
            String(finalRow.fecha_asignacion),
            finalRow.id_turno != null ? Number(finalRow.id_turno) : undefined
          );
          if (resolvedConvId != null) finalRow.id_convocatoria = resolvedConvId;
        }
        if (table === 'menu' && (finalRow.id_convocatoria == null)) {
          const resolvedConvId = await resolveConvocatoriaId(
            Number(finalRow.id_agente),
            String(finalRow.fecha_asignacion),
            undefined
          );
          if (resolvedConvId != null) finalRow.id_convocatoria = resolvedConvId;
        }

        let delQ: any = supabase.from(table).delete();
        for (const [k, v] of Object.entries(logicalKey)) delQ = delQ.eq(k, v);
        const { error: delErr } = await delQ;
        if (delErr) throw new Error(`[${table}] Cleanup failed: ${delErr.message}`);

        const { error: insErr } = await supabase.from(table).insert(finalRow);
        if (insErr) throw new Error(`[${table}] Insert final failed: ${insErr.message}`);
      };

      if (DRAFT_AUDIT_ENABLED) {
        console.groupCollapsed(`[DraftAudit] save-start (${pendingMutations.length} mutaciones)`);
        console.table(
          pendingMutations.map((m, idx) => ({
            idx,
            id: m.id,
            table: m.table,
            action: m.action,
            key: buildMutationKey(m),
            uiDate: m.uiDate,
            dispositivo: m.payload?.id_dispositivo ?? null,
            grupo: m.payload?.numero_grupo ?? null,
          }))
        );
      }

      const duplicates = pendingMutations.reduce((acc, m) => {
        const key = buildMutationKey(m);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const duplicateKeys = Object.entries(duplicates).filter(([, count]) => count > 1);
      if (DRAFT_AUDIT_ENABLED && duplicateKeys.length > 0) {
        console.warn('[DraftAudit] duplicate logical keys in queue', duplicateKeys);
      }

      for (const m of pendingMutations) {
        const cleanPayload = m.payload ? Object.fromEntries(
          Object.entries(m.payload).filter(([key]) => !key.startsWith('_'))
        ) : null;
        
        const cleanMatchParams = m.matchParams ? Object.fromEntries(
          Object.entries(m.matchParams).filter(([key]) => !key.startsWith('_'))
        ) : null;

        if (DRAFT_AUDIT_ENABLED) {
          console.info('[DraftAudit] persist-attempt', {
            id: m.id,
            table: m.table,
            action: m.action,
            key: buildMutationKey(m),
            cleanMatchParams,
            cleanPayload,
          });
        }

        if (m.action === 'upsert') {
          if (m.table === 'menu_semana' || m.table === 'menu') {
            await persistMenuLike(m.table, m.action, cleanPayload, cleanMatchParams);
          } else if (m.table === 'calendario_dispositivos') {
            const { error } = await supabase
              .from('calendario_dispositivos')
              .upsert(cleanPayload, { onConflict: 'fecha,id_turno,id_dispositivo' });
            if (error) throw new Error(`[${m.table}] Upsert failed: ${error.message}`);
          } else {
            const { data: existing } = await supabase.from(m.table).select('*').match(cleanMatchParams || {}).maybeSingle();
            if (existing) {
              const { error } = await supabase.from(m.table).update(cleanPayload).match(cleanMatchParams || {});
              if (error) throw new Error(`[${m.table}] Update failed: ${error.message}`);
            } else {
              const { error } = await supabase.from(m.table).insert(cleanPayload);
              if (error) throw new Error(`[${m.table}] Insert failed: ${error.message}`);
            }
          }
        } else if (m.action === 'insert') {
          if (m.table === 'menu_semana' || m.table === 'menu') {
            await persistMenuLike(m.table, m.action, cleanPayload, cleanMatchParams);
          } else {
            const { error } = await supabase.from(m.table).insert(cleanPayload);
            if (error) throw new Error(`[${m.table}] ${error.message}`);
          }
        } else if (m.action === 'update') {
          if (m.table === 'menu_semana' || m.table === 'menu') {
            await persistMenuLike(m.table, m.action, cleanPayload, cleanMatchParams);
          } else {
            let q = supabase.from(m.table).update(cleanPayload);
            for (const [k, v] of Object.entries(cleanMatchParams || {})) q = q.eq(k, v);
            const { error } = await q;
            if (error) throw new Error(`[${m.table}] ${error.message}`);
          }
        } else if (m.action === 'delete') {
          let q = supabase.from(m.table).delete();
          for (const [k, v] of Object.entries(cleanMatchParams || {})) q = q.eq(k, v);
          const { error } = await q;
          if (error) throw new Error(`[${m.table}] ${error.message}`);
        }

        if (DRAFT_AUDIT_ENABLED) {
          console.info('[DraftAudit] persist-ok', {
            id: m.id,
            table: m.table,
            action: m.action,
            key: buildMutationKey(m),
          });
        }
      }
      setPendingMutations([]);
      setRefreshCounter(c => c + 1);
      setIsLoading(false);
      if (DRAFT_AUDIT_ENABLED) {
        console.info('[DraftAudit] save-success');
        console.groupEnd();
      }
      return { success: true };
    } catch (err: any) {
      console.error("Error saving drafts:", err);
      if (DRAFT_AUDIT_ENABLED) {
        console.error('[DraftAudit] save-failed', err);
        console.groupEnd();
      }
      setIsLoading(false);
      return { success: false, error: err.message };
    }
  };

  const discardDrafts = useCallback(() => {
    setPendingMutations([]);
    setRefreshCounter(c => c + 1); // Forzamos recarga para limpiar cambios locales no guardados
  }, []);

  const hardRefresh = async () => {
    hasLoadedStatic.current = false;
    setRefreshCounter(c => c + 1);
  };


  const refresh = useCallback(() => setRefreshCounter(c => c + 1), []);

  const getMonthParts = useCallback(() => {
    const smParts = (selectedMonth || getCurrentSchoolYearMonth()).split(" ");
    const yFilt = smParts[1] || new Date().getFullYear().toString();
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

  const formatUiDate = (d: string | number, m: string | number) => {
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
  };

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
        let resiData: any[] | null, capData, partsData, dispoCapData, convocadosMatriz, planisData, diasData, inasistenciasRaw, turnoTypeMap: Record<number, string>;
        let capsRep, partsRes, dispoCapsRes, convocadosMatrizRes, allPlanisRes, allDiasRes, inasRes;
        
        if (!hasLoadedStatic.current) {
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
        const activeCohorte = getActiveCohorteSync();
        const { data: rd } = await supabase
          .from('datos_personales')
          .select('id_agente, nombre, apellido, cohorte')
          .eq('activo', true)
          .eq('cohorte', activeCohorte);
        
        resiData = rd;
        if (resiData) setDbResidents(resiData);

        // ═══════════════════════════════════════════════════════════
        // 3. CAPACITACIONES E INASISTENCIAS
        // ═══════════════════════════════════════════════════════════
        // Filter convocatorias by year to avoid 1000-row Supabase limit
        const yearStart = `${yFilt}-01-01`;
        const yearEnd = `${yFilt}-12-31`;

        [capsRep, partsRes, dispoCapsRes, convocadosMatrizRes, allPlanisRes, allDiasRes, inasRes] = await Promise.all([
          supabase.from('capacitaciones').select('id_cap, id_dia, id_turno, grupo'),
          supabase.from('capacitaciones_participantes').select('id_cap, id_agente, asistio').limit(5000),
          supabase.from('capacitaciones_dispositivos').select('id_cap, id_dispositivo').limit(5000),
          supabase.rpc('rpc_obtener_convocados_matriz', { anio_filtro: Number(yFilt) }),
          supabase.from('planificacion').select('id_plani, id_dia, id_turno, grupo').limit(5000),
          supabase.from('dias').select('id_dia, fecha').gte('fecha', yearStart).lte('fecha', yearEnd),
          supabase.from('inasistencias').select('id_agente, fecha_inasistencia, motivo').limit(5000),
        ]);

        capData = capsRep.data || [];
        partsData = partsRes.data || [];
        dispoCapData = dispoCapsRes.data || [];
        convocadosMatriz = convocadosMatrizRes.data || [];
        planisData = allPlanisRes.data || [];
        diasData = allDiasRes.data || [];
        inasistenciasRaw = inasRes.data || [];

        // Pre-build inasistencias map for UI usage later
        const inasMap: InasistenciasMap = {};
        inasistenciasRaw.forEach(row => {
          if (!row.fecha_inasistencia) return;
          const parts = row.fecha_inasistencia.split('-');
          if (parts.length === 3) {
            const uiDate = `${parts[2]}/${parts[1]}`;
            if (!inasMap[uiDate]) inasMap[uiDate] = [];
            if (!inasMap[uiDate].some(x => x.id_agente === row.id_agente)) {
              inasMap[uiDate].push({
                id_agente: row.id_agente,
                motivo: row.motivo || 'Sin justificar'
              });
            }
          }
        });
        setInasistenciasDb(inasMap);

        console.log(`[DataLoad] caps=${capData.length} parts=${partsData.length} capDispos=${dispoCapData.length} convocadosMatriz=${convocadosMatriz.length} planis=${planisData.length} dias=${diasData.length} residents=${resiData?.length || 0}`);

        // 2b. OBTENER CAPACITADOS DESDE VISTA UNIFICADA
        const { data: agentesCapacitados } = await supabase.rpc('rpc_obtener_vista_capacitados');

        // Build caps using clean builder
        if (resiData && resiData.length > 0) {
          const { residentsMap, agentGroups: groups } = buildResidentCaps({
            capData,
            partsData,
            dispoData: dispoCapData,
            diasData,
            resiData,
            convocadosMatriz,
            inasistenciasRaw,
          });
          setAgentGroups(groups);
          setAllResidentsDb(Object.values(residentsMap));
        }

        // ═══════════════════════════════════════════════════════════
        // 4. TURNOS LOOKUP
        // ═══════════════════════════════════════════════════════════
        const turnosLookupRes = await supabase.from('turnos').select('id_turno, tipo_turno');
        turnoTypeMap = {};
        if (turnosLookupRes.data) {
          turnosLookupRes.data.forEach(t => { turnoTypeMap[t.id_turno] = t.tipo_turno; });
        }

          staticCache.current = { resiData, capData, partsData, dispoCapData, convocadosMatriz, planisData, diasData, inasistenciasRaw, turnoTypeMap };
          hasLoadedStatic.current = true;
        } else {
          ({ resiData, capData, partsData, dispoCapData, convocadosMatriz, planisData, diasData, inasistenciasRaw, turnoTypeMap } = staticCache.current);
        }

        // ═══════════════════════════════════════════════════════════
        // 5. ASIGNACIONES Y CONFIGURACION
        // ═══════════════════════════════════════════════════════════
        const [menuRes, menuSemanaRes, configRes] = await Promise.all([
          supabase.from('menu')
            .select('*')
            .gte('fecha_asignacion', startOfMonth)
            .lte('fecha_asignacion', endOfMonth),
          supabase.from('menu_semana')
            .select('*')
            .gte('fecha_asignacion', startOfMonth)
            .lte('fecha_asignacion', endOfMonth),
          supabase.from('configuracion_turnos')
            .select('*')
            .gte('fecha', startOfMonth)
            .lte('fecha', endOfMonth)
        ]);

        const menuData = menuRes.data || [];
        const menuSemanaData = menuSemanaRes.data || [];
        const configData = configRes.data || [];

        if (DRAFT_AUDIT_ENABLED && menuSemanaData.length > 0) {
          const dupCounter: Record<string, number> = {};
          menuSemanaData.forEach((ms: any) => {
            const key = `ms:${ms.id_agente}:${ms.fecha_asignacion}:${ms.id_turno}`;
            dupCounter[key] = (dupCounter[key] || 0) + 1;
          });
          const duplicates = Object.entries(dupCounter).filter(([, count]) => count > 1);
          if (duplicates.length > 0) {
            console.warn('[DraftAudit] menu_semana duplicated keys on load', duplicates.slice(0, 50));
          }
        }

        // Build numero_grupo map from menu_semana
        const grupoMap: Record<string, number | null> = {};
        
        // Build tipo_organizacion map from configuracion_turnos
        const orgTypeMap: Record<string, string> = {};
        configData.forEach(cfg => {
          if (!cfg.fecha) return;
          const tipoTurno = turnoTypeMap[cfg.id_turno] || '';
          if (!matchesTurnoFilter(tipoTurno)) return;
          const [fy, fm, fd] = cfg.fecha.split('-');
          if (fy === yFilt && fm === mmFilt) {
            const uiDate = formatUiDate(fd, fm);
            orgTypeMap[uiDate] = cfg.tipo_organizacion;
          }
        });

        menuSemanaData.forEach(ms => {
          if (!ms.fecha_asignacion) return;
          const tipo = turnoTypeMap[ms.id_turno] || '';
          if (!matchesTurnoFilter(tipo)) return;
          const key = `${ms.id_agente}-${ms.fecha_asignacion}-${ms.id_dispositivo}`;
          grupoMap[key] = ms.numero_grupo;
        });
        setTipoOrganizacionMap(orgTypeMap);

        if (resiData) {
          const matrix: AssignmentsMatrix = {};
          const convocadosCount: Record<string, number> = {};
          const convocadosList: ConvocadosMap = {};
          const nameDict: Record<number, string> = {};
          const dateAgentConv: Record<string, Record<number, number>> = {};
          const dateAgentConvStatus: Record<string, Record<number, string>> = {};
          
          resiData.forEach(r => nameDict[r.id_agente] = `${r.apellido} ${r.nombre}`);

          // For apertura: use `menu` table
          // For tarde/manana: use `menu_semana` table
          const isApertura = turnoFilter === 'apertura';

          if (isApertura) {
            menuData.forEach(a => {
              if (!a.fecha_asignacion) return;
              const [y, m, d] = a.fecha_asignacion.split("-");
              if (y !== yFilt || m !== mmFilt) return;
              const uiDate = formatUiDate(d, m);

              if (!convocadosList[uiDate]) convocadosList[uiDate] = [];
              if (!convocadosList[uiDate].includes(a.id_agente)) {
                convocadosList[uiDate].push(a.id_agente);
                convocadosCount[uiDate] = (convocadosCount[uiDate] || 0) + 1;
              }

              // Populate conv map from menu row
              if (a.id_convocatoria) {
                if (!dateAgentConv[uiDate]) dateAgentConv[uiDate] = {};
                dateAgentConv[uiDate][a.id_agente] = a.id_convocatoria;
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
                  acompana_grupo: !!(a as any)['acompa\u00f1a_grupo'],
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
              const uiDate = formatUiDate(d, m);

              if (!convocadosList[uiDate]) convocadosList[uiDate] = [];
              if (!convocadosList[uiDate].includes(ms.id_agente)) {
                convocadosList[uiDate].push(ms.id_agente);
                convocadosCount[uiDate] = (convocadosCount[uiDate] || 0) + 1;
              }

              // Populate conv map from menu_semana row
              if (ms.id_convocatoria) {
                if (!dateAgentConv[uiDate]) dateAgentConv[uiDate] = {};
                dateAgentConv[uiDate][ms.id_agente] = ms.id_convocatoria;
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
                  acompana_grupo: !!(ms as any)['acompa\u00f1a_grupo'],
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
                const uiDate = formatUiDate(fd, fm);
                planiToUiDate[p.id_plani] = uiDate;
                filteredPlaniIds.push(p.id_plani);
              });

              if (filteredPlaniIds.length > 0) {
                // Fetch only for these planiIds to avoid hitting the 1000 row API limit
                // Notice we removed .eq('estado', 'vigente') so we can also track 'cancelada'
                const { data: convsData, error: convErr } = await supabase.from('convocatoria')
                  .select('id_convocatoria, id_agente, id_plani, estado')
                  .in('id_plani', filteredPlaniIds);
                
                if (convErr) {
                  console.error("Error fetching convocatoria:", convErr);
                } else if (convsData) {
                  convsData.forEach(c => {
                    const uiDate = planiToUiDate[c.id_plani];
                    if (!uiDate) return;

                    if (!dateAgentConv[uiDate]) dateAgentConv[uiDate] = {};
                    if (!dateAgentConvStatus[uiDate]) dateAgentConvStatus[uiDate] = {};

                    // Save id_convocatoria so we can reference it, even if canceled (we'll filter visually)
                    if (!dateAgentConv[uiDate][c.id_agente]) {
                      dateAgentConv[uiDate][c.id_agente] = c.id_convocatoria;
                    }

                    // Track status
                    dateAgentConvStatus[uiDate][c.id_agente] = c.estado || 'vigente';

                    // Only count them as "active" in the UI pool if they are actually vigente
                    if (c.estado === 'vigente') {
                      if (!convocadosList[uiDate]) convocadosList[uiDate] = [];
                      if (!convocadosList[uiDate].includes(c.id_agente)) {
                        convocadosList[uiDate].push(c.id_agente);
                        convocadosCount[uiDate] = (convocadosCount[uiDate] || 0) + 1;
                      }
                    }
                  });
                }
              }
              setAgentConvocatoriaMap(dateAgentConv);
              setAgentConvocatoriaStatusMap(dateAgentConvStatus);
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
                const uiDate = formatUiDate(fd, fm);
                if (!newCalendarDb[uiDate]) newCalendarDb[uiDate] = {};
                // Take the cupo directly instead of cumulatively summing it
                // to prevent duplicated shifts from inflating the matrix value
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
            const uiDate = formatUiDate(fd, fm);
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
              const uiDate = formatUiDate(fd, fm);
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
        // (Inasistencias were already loaded in step 3 to feed caps-builder)

        // ═══════════════════════════════════════════════════════════
        // 10. METRICAS ANUALES DE ROTACION
        // ═══════════════════════════════════════════════════════════
        try {
          const aperturaPromise = supabase.rpc('rpc_metricas_rotacion_anual', {
            p_year: parseInt(yFilt),
            p_turno: 'apertura'
          });
          const tardeMananaPromise = supabase.rpc('rpc_metricas_rotacion_anual', {
            p_year: parseInt(yFilt),
            p_turno: 'turno'
          });
          const acompanaPromise = supabase.rpc('rpc_metricas_acompana_anual', {
            p_year: parseInt(yFilt)
          });

          const [aperturaRes, tardeMananaRes, acompanaRes] = await Promise.all([
            aperturaPromise,
            tardeMananaPromise,
            acompanaPromise
          ]);

          let aperturaMap: AnnualMetricsMap = {};
          if (aperturaRes.error) {
            console.error("Error fetching apertura metrics:", aperturaRes.error);
          } else if (aperturaRes.data) {
            aperturaRes.data.forEach(row => {
              const { id_agente, id_dispositivo, repeticiones } = row;
              if (!aperturaMap[id_agente]) {
                aperturaMap[id_agente] = { uniqueDevices: new Set(), totalAssignments: 0, deviceReps: {} };
              }
              const repCount = parseInt(repeticiones);
              const devStr = String(id_dispositivo);
              aperturaMap[id_agente].totalAssignments += repCount;
              aperturaMap[id_agente].uniqueDevices.add(devStr);
              aperturaMap[id_agente].deviceReps[devStr] = repCount;
            });
            setAperturaMetricsDb(aperturaMap);
          }

          let tardeMananaMap: AnnualMetricsMap = {};
          if (tardeMananaRes.error) {
            console.error("Error fetching tarde/manana metrics:", tardeMananaRes.error);
          } else if (tardeMananaRes.data) {
            tardeMananaRes.data.forEach(row => {
              const { id_agente, id_dispositivo, repeticiones } = row;
              if (!tardeMananaMap[id_agente]) {
                tardeMananaMap[id_agente] = { uniqueDevices: new Set(), totalAssignments: 0, deviceReps: {} };
              }
              const repCount = parseInt(repeticiones);
              const devStr = String(id_dispositivo);
              tardeMananaMap[id_agente].totalAssignments += repCount;
              tardeMananaMap[id_agente].uniqueDevices.add(devStr);
              tardeMananaMap[id_agente].deviceReps[devStr] = repCount;
            });
            setTardeMananaMetricsDb(tardeMananaMap);
          }

          let acompanaMap: Record<number, number> = {};
          if (acompanaRes.error) {
            console.error("Error fetching acompana metrics:", acompanaRes.error);
          } else if (acompanaRes.data) {
            acompanaRes.data.forEach(row => {
              const { id_agente, repeticiones } = row;
              acompanaMap[id_agente] = parseInt(repeticiones);
            });
            setAcompanaMetricsDb(acompanaMap);
          }

          if (turnoFilter === 'apertura') {
            setAnnualMetricsDb(aperturaMap);
          } else {
            setAnnualMetricsDb(tardeMananaMap);
          }
        } catch (e) {
          console.error('Error metrics:', e);
        }

        // ═══════════════════════════════════════════════════════════
        // 11. VISITAS GRUPALES (all turnos — informational for apertura)
        // ═══════════════════════════════════════════════════════════
        try {
          const { data: visitasData } = await supabase
            .from('asignaciones_visita')
            .select('id_asignacion, id_plani, nombre_institucion, cantidad_personas_original, rango_etario, estado, numero_grupo')
            .in('estado', ['asignado', 'asignada', 'confirmado', 'confirmada']);

          console.log(`[Visitas] Fetched ${visitasData?.length || 0} visitas (asignado/confirmado only)`);
          if (visitasData && visitasData.length > 0) {
            const diasDict3: Record<number, string> = {};
            diasData.forEach(dd => { if (dd.fecha) diasDict3[dd.id_dia] = dd.fecha.substring(0, 10); });

            const planiDateMap: Record<number, string> = {};
            planisData.forEach(p => {
              const tipo = turnoTypeMap[p.id_turno] || '';
              const isVisitTurno = tipo.toLowerCase().includes('turno tarde') || tipo.toLowerCase().includes('turno mañana') || tipo.toLowerCase().includes('turno manana');
              if (turnoFilter === 'apertura' ? isVisitTurno : matchesTurnoFilter(tipo)) {
                const fecha = diasDict3[p.id_dia];
                if (!fecha) return;
                const [fy, fm, fd] = fecha.split('-');
                if (fy !== yFilt || fm !== mmFilt) return;
                planiDateMap[p.id_plani] = `${fd}/${fm}`;
              }
            });

            const vMap: VisitasByDateMap = {};
            visitasData.forEach(v => {
              if (!v.id_plani) return;
              const uiDate = planiDateMap[v.id_plani];
              if (!uiDate) return;
              if (!vMap[uiDate]) vMap[uiDate] = [];
              vMap[uiDate].push({
                id_asignacion: v.id_asignacion,
                nombre_institucion: v.nombre_institucion,
                cantidad_personas: v.cantidad_personas_original,
                rango_etario: v.rango_etario,
                estado: v.estado,
                numero_grupo: (v.numero_grupo as number[] | null) ?? null,
              });
            });
            console.log(`[Visitas] Mapped to dates:`, Object.keys(vMap).map(d => `${d}(${vMap[d].length})`).join(', ') || 'none');
            setVisitasByDate(vMap);
          } else {
            setVisitasByDate({});
          }
        } catch (e) {
          console.error('Error visitas:', e);
          setVisitasByDate({});
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

  const isAgentCanceled = useCallback((agentId: number, uiDate: string): boolean => {
    return agentConvocatoriaStatusMap[uiDate]?.[agentId] === 'cancelada';
  }, [agentConvocatoriaStatusMap]);

  const getAbsenceMotivo = useCallback((agentId: number, uiDate: string): string => {
    const found = (inasistenciasDb[uiDate] || []).find(x => x.id_agente === agentId);
    return found?.motivo || '';
  }, [inasistenciasDb]);

  return {
    dbDevices, dbResidents, allResidentsDb, assignmentsDb,
    agentGroups, calendarDb, setCalendarDb, convocadosCountDb,
    convocadosDb, isLoading, setIsLoading, activeDates,
    dateTurnoMap, inasistenciasDb, agentConvocatoriaMap,
    agentConvocatoriaStatusMap, // Export the new map just in case
    tipoOrganizacionMap, setTipoOrganizacionMap, turnoFilter,
    visitasByDate,
    annualMetricsDb, // export anual metrics
    aperturaMetricsDb, // export apertura metrics
    tardeMananaMetricsDb, // export tarde/manana metrics
    acompanaMetricsDb, // export acompana metrics
    refresh, isAgentAbsent, isAgentCanceled, getAbsenceMotivo, getMonthParts,
    setAssignmentsDb,
    pendingMutations, addAssignmentDraft, removeAssignmentDraft, saveDrafts, discardDrafts, hardRefresh,
  };
}
