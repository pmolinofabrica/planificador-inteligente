import React from 'react';
import { Check, AlertCircle, Moon, Lock, Clock } from 'lucide-react';
import { getFloorColor, getScoreColor, computeRotationMetrics, getRepsColor, getNotCapacitadoStyle } from '@/lib/floor-utils';
import { normalizeStr } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { SelectedDevice, SelectedResident, AssignmentDataContext, UndoEntry } from '@/types/assignments';

interface CellSidebarProps {
  selectedDevice: SelectedDevice;
  selectedDate: string;
  setSelectedDevice: (d: SelectedDevice | null) => void;
  setSelectedDateFilter: (d: string | null) => void;
  setSelectedResident: (r: SelectedResident | null) => void;
  data: AssignmentDataContext;
  pushUndo: (entry: Omit<UndoEntry, '_timestamp'>) => void;
  year: string;
}

export const CellSidebar: React.FC<CellSidebarProps> = ({
  selectedDevice, selectedDate, setSelectedDevice, setSelectedDateFilter,
  setSelectedResident, data, pushUndo, year,
}) => {
  const { allResidentsDb, convocadosDb, assignmentsDb, dbDevices, isAgentAbsent, isAgentCanceled, isLoading, setIsLoading, refresh, agentConvocatoriaMap, turnoFilter, dateTurnoMap, agentTipoTurnoMap, tipoOrganizacionMap } = data;
  const deviceId = selectedDevice.id;
  const convocadoIds = new Set(convocadosDb[selectedDate] || []);
  const isApertura = turnoFilter === 'apertura';
  const agentTipos = agentTipoTurnoMap[selectedDate] || {};
  const isAperturaB = (id: number) => normalizeStr(agentTipos[id] || '') === 'apertura al publico b';
  const orgType = tipoOrganizacionMap[selectedDate] || 'dispositivos fijos';
  const isRotation = orgType.includes('rotacion');

  const [d, mStr] = selectedDate.split("/");
  const fechaDB = `${year}-${mStr.padStart(2, '0')}-${d.padStart(2, '0')}`;

  // Build occupancy map and acompana_grupo map
  const occupancies: Record<number, string> = {};
  const acompanaMap: Record<number, boolean> = {};
  Object.entries(assignmentsDb[selectedDate] || {}).forEach(([devId, arr]: [string, any]) => {
    const devObj = dbDevices.find((dd: any) => dd.id === devId);
    arr.forEach((r: any) => { 
      occupancies[r.id] = devObj ? devObj.name : 'Otro';
      if (r.acompana_grupo) acompanaMap[r.id] = true;
    });
  });

  // Current assignments in this cell
  const currentAssignments = assignmentsDb[selectedDate]?.[deviceId] || [];
  const currentIds = new Set(currentAssignments.map((a: any) => a.id));

  type AltItem = { id: number; name: string; reason: string; isBusy: boolean; isAbsent: boolean; isCanceled: boolean };
  const tier1: AltItem[] = []; // convocado + capacitado
  const tier2: AltItem[] = []; // convocado + no capacitado
  const tier3: AltItem[] = []; // descanso + capacitado
  const tier4: AltItem[] = []; // descanso + no capacitado

  allResidentsDb.forEach((res: any) => {
    if (currentIds.has(res.id)) return;
    const isConvocado = convocadoIds.has(res.id);
    const capDate = res.caps[deviceId];
    const isCapacitado = !!capDate && capDate <= fechaDB;
    const currentLocation = occupancies[res.id];
    const isBusy = !!currentLocation;
    const isAbsent = isAgentAbsent(res.id, selectedDate);
    const isCanceled = isAgentCanceled && isAgentCanceled(res.id, selectedDate);

    const capInfo = capDate ? ` (Cap: ${capDate})` : '';
    const isAcompanaGrupo = !!acompanaMap[res.id];
    let reason = '';
    if (isAbsent) reason = '🚫 Inasistente';
    else if (isCanceled) reason = '❌ Convocatoria Cancelada';
    else if (isBusy && isConvocado && isApertura) reason = `🔄 ${currentLocation}`;
    else if (isBusy && isAcompanaGrupo) reason = `🔄 ${currentLocation}`;
    else if (isBusy) reason = isRotation ? `🔄 ${currentLocation}` : `🔒 ${currentLocation}`;
    else reason = isConvocado ? 'Libre' : 'Descanso';
    reason += capInfo;

    // In rotation modes OR Apertura convocados OR acompaña grupo, busy residents CAN be transferred
    const effectivelyBusy = isAbsent || isCanceled || (isBusy && !isRotation && !(isConvocado && isApertura) && !isAcompanaGrupo);
    const alt: AltItem = { id: res.id, name: res.name, reason, isBusy: effectivelyBusy, isAbsent, isCanceled };

    if (isConvocado && isCapacitado) tier1.push(alt);
    else if (isConvocado && !isCapacitado) tier2.push(alt);
    else if (!isConvocado && isCapacitado) tier3.push(alt);
    else tier4.push(alt);
  });

  const sortTiers = (arr: AltItem[]) => {
    return arr.sort((a, b) => {
      const repsA = isApertura
        ? (data.aperturaMetricsDb?.[a.id]?.deviceReps?.[selectedDevice.id] || 0)
        : (data.tardeMananaMetricsDb?.[a.id]?.deviceReps?.[selectedDevice.id] || 0);
      const repsB = isApertura
        ? (data.aperturaMetricsDb?.[b.id]?.deviceReps?.[selectedDevice.id] || 0)
        : (data.tardeMananaMetricsDb?.[b.id]?.deviceReps?.[selectedDevice.id] || 0);
      return repsA - repsB;
    });
  };

  sortTiers(tier1);
  sortTiers(tier2);
  sortTiers(tier3);
  sortTiers(tier4);

  const disp = dbDevices.find((dd: any) => dd.id === deviceId);

  // Check cupo
  const cupoLimit = data.calendarDb[selectedDate]?.[deviceId] || disp?.max || 0;
  const currentCount = currentAssignments.length;

  const handleAssign = async (agentId: number) => {
    if (isLoading) return;

    // Cupo overflow check
    if (currentCount >= cupoLimit) {
      const confirmed = confirm(
        `⚠️ El dispositivo "${selectedDevice.name}" ya tiene ${currentCount}/${cupoLimit} asignados (cupo completo).\n\n¿Desea agregar un cupo adicional y asignar igualmente?`
      );
      if (!confirmed) return;
      const turnoIdForCupo = data.dateTurnoMap[selectedDate] || (isApertura ? 45 : 4);
      data.addAssignmentDraft({
        id: `cupo-${selectedDate}-${deviceId}`,
        table: 'calendario_dispositivos',
        action: 'upsert',
        matchParams: { fecha: fechaDB, id_dispositivo: parseInt(deviceId), id_turno: turnoIdForCupo },
        payload: { fecha: fechaDB, id_dispositivo: parseInt(deviceId), id_turno: turnoIdForCupo, cupo_objetivo: cupoLimit + 1 },
        uiDate: selectedDate
      });
    }

    // Resolve convocatoria ID — required by both menu and menu_semana
    let convId = agentConvocatoriaMap[selectedDate]?.[agentId];
    console.log(`[CellSidebar] convId lookup: date=${selectedDate} agentId=${agentId} convId=${convId}`);
    console.log(`[CellSidebar] map keys for date:`, Object.keys(agentConvocatoriaMap[selectedDate] || {}));
    
    if (!convId) {
      console.log(`[CellSidebar] Convocatoria not in map for agent ${agentId} on ${selectedDate}. Trying fallback...`);
      setIsLoading(true);
      try {
        const { data: diaData } = await supabase.from('dias').select('id_dia').eq('fecha', fechaDB).single();
        if (diaData) {
          // dateTurnoMap for Apertura should have id_turno=45; default to 45 if missing
          const turnoId = data.dateTurnoMap[selectedDate] || (data.turnoFilter === 'apertura' ? 45 : null);
          if (!turnoId) {
            setIsLoading(false);
            alert(`No se pudo resolver id_turno para ${selectedDate}.`);
            return;
          }
          console.log(`[CellSidebar] Fallback: fecha=${fechaDB} idDia=${diaData.id_dia} turnoId=${turnoId}`);
          const { data: convRows } = await supabase
            .from('convocatoria')
            .select(`
              id_convocatoria,
              planificacion!inner(id_turno, id_dia)
            `)
            .eq('id_agente', agentId)
            .eq('estado', 'vigente')
            .eq('planificacion.id_turno', turnoId)
            .eq('planificacion.id_dia', diaData.id_dia)
            .limit(1);

          if (convRows?.[0]) {
            convId = convRows[0].id_convocatoria;
            console.log(`[CellSidebar] Fallback found conv ${convId}`);
          }
        }
      } catch (err) {
        console.error("Error in fallback conv lookup:", err);
      }
      setIsLoading(false);
    }

    if (!convId) {
      alert(`⚠️ No se encontró una convocatoria vigente para el turno ${data.turnoFilter} en la fecha ${selectedDate}.\n\nDebe existir una convocatoria para poder asignar.`);
      return;
    }

    setIsLoading(true);
    try {
      const resName = data.allResidentsDb?.find((r:any) => r.id === agentId)?.name || "Borrador";

      if (isApertura) {
        const { data: existing, error: fetchErr } = await supabase.from('menu').select('*')
          .eq('id_agente', agentId).eq('fecha_asignacion', fechaDB);
        if (fetchErr) throw fetchErr;

        if (existing && existing.length > 0) {
          const vacantRow = existing.find((m: any) => m.id_dispositivo === 999);
          const firstRow = existing[0];
          if (vacantRow) {
            data.addAssignmentDraft({
              id: `assign-${agentId}-${fechaDB}-${data.turnoFilter}`,
              table: 'menu',
              action: 'update',
              matchParams: { id_agente: agentId, fecha_asignacion: fechaDB, id_dispositivo: 999 },
              payload: { id_dispositivo: parseInt(deviceId), _ui_name: resName },
              uiDate: selectedDate
            });
          } else {
            data.addAssignmentDraft({
              id: `assign-${agentId}-${fechaDB}-${data.turnoFilter}`,
              table: 'menu',
              action: 'update',
              matchParams: { id_agente: agentId, fecha_asignacion: fechaDB, id_dispositivo: firstRow.id_dispositivo },
              payload: { id_dispositivo: parseInt(deviceId), _ui_name: resName },
              uiDate: selectedDate
            });
          }
        } else {
          data.addAssignmentDraft({
            id: `assign-${agentId}-${fechaDB}-${data.turnoFilter}`,
            table: 'menu',
            action: 'insert',
              matchParams: { id_agente: agentId, fecha_asignacion: fechaDB },
            payload: {
              id_agente: agentId, id_dispositivo: parseInt(deviceId),
              fecha_asignacion: fechaDB, estado_ejecucion: 'planificado', id_convocatoria: convId,
              _ui_name: resName
            },
            uiDate: selectedDate
          });
        }
      } else {
        const turnoId = dateTurnoMap[selectedDate];
        if (!turnoId) {
          setIsLoading(false);
          alert(`No se pudo resolver id_turno para ${selectedDate}. Sin ese dato no se guarda para evitar inconsistencias.`);
          return;
        }

        if (isRotation) {
          let inheritedGroup: number | null = null;
          try {
            const { data: existingRows } = await supabase.from('menu_semana')
              .select('numero_grupo')
              .eq('id_agente', agentId)
              .eq('fecha_asignacion', fechaDB)
              .eq('id_turno', turnoId)
              .neq('id_dispositivo', 999)
              .limit(1);
            if (existingRows && existingRows.length > 0 && existingRows[0].numero_grupo != null) {
              inheritedGroup = existingRows[0].numero_grupo;
            }
          } catch (e) {}

          data.addAssignmentDraft({
            id: `assign-${agentId}-${fechaDB}-${data.turnoFilter}`,
            table: 'menu_semana',
            action: 'upsert',
              matchParams: { id_agente: agentId, fecha_asignacion: fechaDB, id_turno: turnoId, id_dispositivo: parseInt(deviceId) },
            payload: {
              id_agente: agentId, id_dispositivo: parseInt(deviceId),
              fecha_asignacion: fechaDB, estado_ejecucion: 'planificado',
              id_convocatoria: convId, id_turno: turnoId,
              tipo_organizacion: orgType,
              _ui_name: resName,
              ...(inheritedGroup != null ? { numero_grupo: inheritedGroup } : {}),
            },
            uiDate: selectedDate
          });

        } else {
          const { data: existing, error: fetchErr } = await supabase.from('menu_semana').select('*')
            .eq('id_agente', agentId).eq('fecha_asignacion', fechaDB).eq('id_turno', turnoId);
          if (fetchErr) throw fetchErr;

          const hasAcompana = existing?.some((m: any) => m['acompa\u00f1a_grupo']);

          if (existing && existing.length > 0) {
            const vacantRow = existing.find((m: any) => m.id_dispositivo === 999);
            if (vacantRow) {
            data.addAssignmentDraft({
              id: `assign-${agentId}-${fechaDB}-${data.turnoFilter}`,
              table: 'menu_semana',
              action: 'update',
              matchParams: { id_agente: agentId, fecha_asignacion: fechaDB, id_dispositivo: 999, id_turno: turnoId },
              payload: { id_dispositivo: parseInt(deviceId), tipo_organizacion: orgType, _ui_name: resName },
              uiDate: selectedDate
            });
          } else if (hasAcompana) {
            // Acompaña grupo: agregar nuevo dispositivo (INSERT) sin moverlo del actual
            data.addAssignmentDraft({
              id: `assign-${agentId}-${fechaDB}-${data.turnoFilter}-${deviceId}`,
              table: 'menu_semana',
              action: 'insert',
              matchParams: { id_agente: agentId, fecha_asignacion: fechaDB, id_turno: turnoId, id_dispositivo: parseInt(deviceId) },
              payload: {
                id_agente: agentId, id_dispositivo: parseInt(deviceId),
                fecha_asignacion: fechaDB, estado_ejecucion: 'planificado',
                id_convocatoria: convId, id_turno: turnoId,
                tipo_organizacion: orgType,
                _ui_name: resName
              },
              uiDate: selectedDate
            });
          } else {
            data.addAssignmentDraft({
              id: `assign-${agentId}-${fechaDB}-${data.turnoFilter}`,
              table: 'menu_semana',
              action: 'update',
              matchParams: {
                id_agente: agentId,
                fecha_asignacion: fechaDB,
                id_turno: turnoId,
                id_dispositivo: existing[0].id_dispositivo,
              },
              payload: { id_dispositivo: parseInt(deviceId), tipo_organizacion: orgType, _ui_name: resName },
              uiDate: selectedDate
            });
          }
          } else {
            data.addAssignmentDraft({
              id: `assign-${agentId}-${fechaDB}-${data.turnoFilter}`,
              table: 'menu_semana',
              action: 'insert',
              matchParams: { id_agente: agentId, fecha_asignacion: fechaDB, id_turno: turnoId, id_dispositivo: parseInt(deviceId) },
              payload: {
                id_agente: agentId, id_dispositivo: parseInt(deviceId),
                fecha_asignacion: fechaDB, estado_ejecucion: 'planificado',
                id_convocatoria: convId, id_turno: turnoId,
                tipo_organizacion: orgType,
                _ui_name: resName
              },
              uiDate: selectedDate
            });
          }
        }
      }
      closeSidebar();
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error asignando:', err);
      alert(`Error al asignar: ${err.message || err}`);
      setIsLoading(false);
    }
  };

  const closeSidebar = () => {
    setSelectedDevice(null);
    setSelectedDateFilter(null);
  };


  const renderTier = (title: string, items: AltItem[], colorClass: string, Icon: any) => (
    items.length > 0 && (
      <div className="mb-4">
        <span className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1 ${colorClass}`}>
          <Icon className="w-3 h-3" /> {title} ({items.length})
        </span>
        <div className="space-y-1.5">
          {items.map((alt, i) => (
            <button key={i} onClick={() => !alt.isBusy && handleAssign(alt.id)}
              className={`w-full text-left p-2.5 rounded-lg border-2 transition-all flex justify-between items-center ${
                alt.isBusy
                  ? 'border-border bg-muted opacity-75 cursor-not-allowed'
                  : 'border-emerald-200 bg-emerald-50 hover:border-emerald-400 cursor-pointer'
              }`}>
              <div>
                <div className={`font-bold text-sm ${alt.isAbsent || alt.isCanceled ? 'line-through text-stone-400' : ''} flex items-center gap-1`}>
                  {isAperturaB(alt.id) && <Clock className="w-3 h-3 text-amber-500 shrink-0" />}
                  {alt.name}
                </div>
                <div className="text-[10px] font-medium mt-0.5 opacity-80">{alt.reason}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700 whitespace-nowrap" title="Coordinaciones en Apertura al público">
                  Ap: {data.aperturaMetricsDb?.[alt.id]?.deviceReps?.[selectedDevice.id] || 0}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 whitespace-nowrap" title="Coordinaciones en Turno Tarde/Mañana">
                  T/M: {data.tardeMananaMetricsDb?.[alt.id]?.deviceReps?.[selectedDevice.id] || 0}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded border border-purple-200 bg-purple-50 text-purple-700 whitespace-nowrap" title="Veces que acompañó al grupo">
                  🏫 {data.acompanaMetricsDb?.[alt.id] || 0}
                </span>
                {alt.isBusy && <span className="text-xs bg-destructive/10 text-destructive p-1 px-2 rounded-md border border-destructive/20 whitespace-nowrap">
                  {alt.isAbsent ? '🚫' : alt.isCanceled ? '❌' : '🔒'}
                </span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  );

  return (
    <div className="w-96 bg-card border-l border-border shadow-2xl flex flex-col absolute right-0 h-full z-50 overflow-hidden">
      <div className={`p-6 border-b ${getFloorColor(selectedDevice.name)}`}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase mb-1 block opacity-80">Dispositivo × Fecha</span>
            <h3 className="text-lg font-bold">{selectedDevice.name}</h3>
            <span className="text-sm font-medium opacity-70">{selectedDate}</span>
          </div>
          <button onClick={closeSidebar} className="opacity-70 hover:opacity-100 bg-card/20 p-1.5 rounded-md border border-border/30">✕</button>
        </div>
        <div className="text-xs font-medium opacity-70">
          Asignados: {currentAssignments.length} | Rango: {disp?.min}-{disp?.max}
          {!isApertura && <span className="ml-2 text-primary font-bold">({turnoFilter === 'tarde' ? 'Turno Tarde' : 'Turno Mañana'})</span>}
          {isRotation && <span className="ml-2 text-violet-600 font-bold text-[10px]">🔄 {orgType} — Multi-dispositivo</span>}
        </div>
      </div>

      {/* Current assignments */}
      {currentAssignments.length > 0 && (
        <div className="p-4 border-b border-border bg-muted/30">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Asignados actualmente</span>
          <div className="space-y-1">
            {currentAssignments.map((res: any, i: number) => {
              const caps = (allResidentsDb.find((r: any) => r.id === res.id)?.caps) || {};
              const capDate = caps[deviceId];
              const isCapacitado = !!capDate && capDate <= fechaDB;
              return (
              <div key={i}
                onClick={() => {
                  setSelectedResident({ id: res.id, name: res.name, score: res.score, device: selectedDevice.name, date: selectedDate });
                  setSelectedDevice(null);
                  setSelectedDateFilter(null);
                }}
                className={`p-2 rounded border text-xs font-bold cursor-pointer hover:ring-2 hover:ring-primary/30 flex items-center justify-between ${getRepsColor(computeRotationMetrics(res.id, selectedDevice.id, data.dbDevices.length, data.annualMetricsDb).localReps)}`}>
                <span className="flex items-center gap-1">
                  {isAperturaB(res.id) && <Clock className="w-3 h-3 text-amber-500 shrink-0" />}
                  {res.name}
                  {/* No-cap indicator */}
                  {(() => {
                    const resInfo = allResidentsDb.find((r: any) => r.id === res.id);
                    const [dd, mm] = selectedDate.split('/');
                    const fechaDB = `${year}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
                    const notCapStyle = getNotCapacitadoStyle(resInfo?.caps, deviceId, fechaDB);
                    if (notCapStyle) {
                      return <span className="ml-1 text-[8px] text-red-600 bg-red-100 px-1 rounded font-bold animate-pulse">⚠️ SIN CAP</span>;
                    }
                    return null;
                  })()}
                </span>
                <span className="text-[9px] font-mono opacity-70">{computeRotationMetrics(res.id, selectedDevice.id, data.dbDevices.length, data.annualMetricsDb).localReps}×</span>
              </div>
              );
            })}

          </div>
        </div>
      )}

      <div className="p-5 flex-1 overflow-y-auto bg-card">
        <h4 className="text-xs font-bold mb-3 border-b border-border pb-2">Agregar residente</h4>
        {renderTier("Convocado + Capacitado", tier1, "text-emerald-700", Check)}
        {renderTier("Convocado + No Capacitado", tier2, "text-amber-600", AlertCircle)}
        {renderTier("Descanso + Capacitado", tier3, "text-blue-600", Moon)}
        {renderTier("Descanso + No Capacitado", tier4, "text-muted-foreground", AlertCircle)}
      </div>
    </div>
  );
};
