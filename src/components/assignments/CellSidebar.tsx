import React from 'react';
import { Check, AlertCircle, Moon, Lock } from 'lucide-react';
import { getFloorColor, getScoreColor, computeRotationMetrics, getRepsColor } from '@/lib/floor-utils';
import { supabase } from '@/integrations/supabase/client';
import type { SelectedDevice, SelectedResident } from '@/types/assignments';

interface CellSidebarProps {
  selectedDevice: SelectedDevice;
  selectedDate: string;
  setSelectedDevice: (d: SelectedDevice | null) => void;
  setSelectedDateFilter: (d: string | null) => void;
  setSelectedResident: (r: SelectedResident | null) => void;
  data: any;
  pushUndo: (entry: any) => void;
  year: string;
}

export const CellSidebar: React.FC<CellSidebarProps> = ({
  selectedDevice, selectedDate, setSelectedDevice, setSelectedDateFilter,
  setSelectedResident, data, pushUndo, year,
}) => {
  const { allResidentsDb, convocadosDb, assignmentsDb, dbDevices, isAgentAbsent, isLoading, setIsLoading, refresh, agentConvocatoriaMap, turnoFilter, dateTurnoMap, tipoOrganizacionMap } = data;
  const deviceId = selectedDevice.id;
  const convocadoIds = new Set(convocadosDb[selectedDate] || []);
  const isApertura = turnoFilter === 'apertura';
  const orgType = tipoOrganizacionMap[selectedDate] || 'dispositivos fijos';
  const isRotation = orgType.includes('rotacion');

  const [d, mStr] = selectedDate.split("/");
  const fechaDB = `${year}-${mStr.padStart(2, '0')}-${d.padStart(2, '0')}`;

  // Build occupancy map
  const occupancies: Record<number, string> = {};
  Object.entries(assignmentsDb[selectedDate] || {}).forEach(([devId, arr]: [string, any]) => {
    const devObj = dbDevices.find((dd: any) => dd.id === devId);
    arr.forEach((r: any) => { occupancies[r.id] = devObj ? devObj.name : 'Otro'; });
  });

  // Current assignments in this cell
  const currentAssignments = assignmentsDb[selectedDate]?.[deviceId] || [];
  const currentIds = new Set(currentAssignments.map((a: any) => a.id));

  type AltItem = { id: number; name: string; reason: string; isBusy: boolean; isAbsent: boolean };
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

    const capInfo = capDate ? ` (Cap: ${capDate})` : '';
    let reason = '';
    if (isAbsent) reason = '🚫 Inasistente';
    else if (isBusy && isConvocado && isApertura) reason = `🔄 ${currentLocation}`;
    else if (isBusy) reason = isRotation ? `🔄 ${currentLocation}` : `🔒 ${currentLocation}`;
    else reason = isConvocado ? 'Libre' : 'Descanso';
    reason += capInfo;

    // In rotation modes OR Apertura convocados, busy residents CAN be transferred
    const effectivelyBusy = isAbsent || (isBusy && !isRotation && !(isConvocado && isApertura));
    const alt: AltItem = { id: res.id, name: res.name, reason, isBusy: effectivelyBusy, isAbsent };

    if (isConvocado && isCapacitado) tier1.push(alt);
    else if (isConvocado && !isCapacitado) tier2.push(alt);
    else if (!isConvocado && isCapacitado) tier3.push(alt);
    else tier4.push(alt);
  });

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
      const newCalendar = { ...data.calendarDb };
      if (!newCalendar[selectedDate]) newCalendar[selectedDate] = {};
      newCalendar[selectedDate][deviceId] = cupoLimit + 1;
      data.setCalendarDb(newCalendar);
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
          const turnoId = data.dateTurnoMap[selectedDate] || (data.turnoFilter === 'apertura' ? 45 : 4);
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
      if (isApertura) {
        const { data: existing, error: fetchErr } = await supabase.from('menu').select('*')
          .eq('id_agente', agentId).eq('fecha_asignacion', fechaDB);
        if (fetchErr) throw fetchErr;

        if (existing && existing.length > 0) {
          // Update existing menu row(s): move to new device
          const vacantRow = existing.find((m: any) => m.id_dispositivo === 999);
          const firstRow = existing[0];
          if (vacantRow) {
            const { error } = await supabase.from('menu').update({ id_dispositivo: parseInt(deviceId) })
              .eq('id_agente', agentId).eq('fecha_asignacion', fechaDB).eq('id_dispositivo', 999);
            if (error) throw error;
          } else {
            // Transfer from current device to new device
            const { error } = await supabase.from('menu').update({ id_dispositivo: parseInt(deviceId) })
              .eq('id_agente', agentId).eq('fecha_asignacion', fechaDB).eq('id_dispositivo', firstRow.id_dispositivo);
            if (error) throw error;
          }
          pushUndo({ snapshot: { id_agente: agentId, fecha_asignacion: fechaDB, id_dispositivo: firstRow.id_dispositivo } });
        } else {
          const { error } = await supabase.from('menu').insert([{
            id_agente: agentId, id_dispositivo: parseInt(deviceId),
            fecha_asignacion: fechaDB, estado_ejecucion: 'planificado', id_convocatoria: convId
          }]);
          if (error) throw error;
          pushUndo({ snapshot: { id_agente: agentId, fecha_asignacion: fechaDB, _isInsert: true } });
        }
      } else {
        const turnoId = dateTurnoMap[selectedDate] || 4;

        if (isRotation) {
          // Rotación simple/completa: always INSERT new row
          const { error } = await supabase.from('menu_semana').insert([{
            id_agente: agentId, id_dispositivo: parseInt(deviceId),
            fecha_asignacion: fechaDB, estado_ejecucion: 'planificado',
            id_convocatoria: convId, id_turno: turnoId,
            tipo_organizacion: orgType,
          }]);
          if (error) throw error;
          pushUndo({ snapshot: { id_agente: agentId, fecha_asignacion: fechaDB, _isInsert: true, _table: 'menu_semana' } });
        } else {
          // Dispositivos fijos: update existing or insert new
          const { data: existing, error: fetchErr } = await supabase.from('menu_semana').select('*')
            .eq('id_agente', agentId).eq('fecha_asignacion', fechaDB).eq('id_turno', turnoId);
          if (fetchErr) throw fetchErr;

          if (existing && existing.length > 0) {
            const vacantRow = existing.find((m: any) => m.id_dispositivo === 999);
            if (vacantRow) {
              const { error } = await supabase.from('menu_semana').update({ id_dispositivo: parseInt(deviceId) })
                .eq('id_agente', agentId).eq('fecha_asignacion', fechaDB).eq('id_dispositivo', 999).eq('id_turno', turnoId);
              if (error) throw error;
            } else {
              const { error } = await supabase.from('menu_semana').update({ id_dispositivo: parseInt(deviceId) })
                .eq('id_menu_semana', existing[0].id_menu_semana);
              if (error) throw error;
            }
            pushUndo({ snapshot: { id_agente: agentId, fecha_asignacion: fechaDB, id_dispositivo: existing[0].id_dispositivo, _table: 'menu_semana', id_turno: turnoId } });
          } else {
            const { error } = await supabase.from('menu_semana').insert([{
              id_agente: agentId, id_dispositivo: parseInt(deviceId),
              fecha_asignacion: fechaDB, estado_ejecucion: 'planificado',
              id_convocatoria: convId, id_turno: turnoId,
              tipo_organizacion: orgType,
            }]);
            if (error) throw error;
            pushUndo({ snapshot: { id_agente: agentId, fecha_asignacion: fechaDB, _isInsert: true, _table: 'menu_semana' } });
          }
        }
      }
      closeSidebar();
      refresh();
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
                <div className={`font-bold text-sm ${alt.isAbsent ? 'line-through text-stone-400' : ''}`}>{alt.name}</div>
                <div className="text-[10px] font-medium mt-0.5 opacity-80">{alt.reason}</div>
              </div>
              {alt.isBusy && <span className="text-xs bg-destructive/10 text-destructive p-1 px-2 rounded-md border border-destructive/20">
                {alt.isAbsent ? '🚫' : '🔒'}
              </span>}
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
            {currentAssignments.map((res: any, i: number) => (
              <div key={i}
                onClick={() => {
                  setSelectedResident({ id: res.id, name: res.name, score: res.score, device: selectedDevice.name, date: selectedDate });
                  setSelectedDevice(null);
                  setSelectedDateFilter(null);
                }}
                className={`p-2 rounded border text-xs font-bold cursor-pointer hover:ring-2 hover:ring-primary/30 flex items-center justify-between ${getRepsColor(computeRotationMetrics(res.id, selectedDevice.id, data.assignmentsDb, data.dbDevices.length).localReps)}`}>
                <span>{res.name}</span>
                <span className="text-[9px] font-mono opacity-70">{computeRotationMetrics(res.id, selectedDevice.id, data.assignmentsDb, data.dbDevices.length).localReps}×</span>
              </div>
            ))}
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
