import React, { useMemo } from 'react';
import { Calendar, Activity, ArrowRightLeft, Check, AlertCircle, UserMinus, BarChart3 } from 'lucide-react';
import { getFloorColor, getScoreColor, computeRotationMetrics } from '@/lib/floor-utils';
import { supabase } from '@/integrations/supabase/client';
import type { SelectedResident } from '@/types/assignments';

interface ResidentSidebarProps {
  selectedResident: SelectedResident;
  setSelectedResident: (r: SelectedResident | null) => void;
  data: any;
  pushUndo: (entry: any) => void;
  year: string;
}

export const ResidentSidebar: React.FC<ResidentSidebarProps> = ({
  selectedResident, setSelectedResident, data, pushUndo, year,
}) => {
  const { dbDevices, allResidentsDb, assignmentsDb, convocadosDb, isAgentAbsent, getAbsenceMotivo, isLoading, setIsLoading, refresh, turnoFilter, dateTurnoMap, agentConvocatoriaMap, tipoOrganizacionMap } = data;
  const disp = dbDevices.find((d: any) => d.name === selectedResident.device);
  const deviceId = disp?.id;
  const date = selectedResident.date;

  const metrics = useMemo(() =>
    computeRotationMetrics(selectedResident.id, deviceId, assignmentsDb, dbDevices.length),
    [selectedResident.id, deviceId, assignmentsDb, dbDevices.length]
  );

  // Compute average diversity across all assigned agents for comparison
  const avgDiversity = useMemo(() => {
    const allAgentIds = new Set<number>();
    for (const dateDevs of Object.values(assignmentsDb)) {
      for (const agents of Object.values(dateDevs as Record<string, { id: number }[]>)) {
        for (const ag of agents) allAgentIds.add(ag.id);
      }
    }
    if (allAgentIds.size === 0) return 0;
    let total = 0;
    for (const aid of allAgentIds) {
      const m = computeRotationMetrics(aid, undefined, assignmentsDb, dbDevices.length);
      total += m.diversityPct;
    }
    return Math.round(total / allAgentIds.size);
  }, [assignmentsDb, dbDevices.length]);
  const convocados = new Set(convocadosDb[date] || []);
  const isApertura = turnoFilter === 'apertura';

  const [dayStr, monthStr] = date.split("/");
  const fechaDB = `${year}-${monthStr.padStart(2, '0')}-${dayStr.padStart(2, '0')}`;

  const occupancies: Record<number, string> = {};
  Object.entries(assignmentsDb[date] || {}).forEach(([devIdStr, arr]: [string, any]) => {
    const devObj = dbDevices.find((d: any) => d.id === devIdStr);
    arr.forEach((r: any) => { occupancies[r.id] = devObj ? devObj.name : 'Otro'; });
  });

  const tier1: any[] = [], tier2: any[] = [], tier3: any[] = [], tier4: any[] = [];

  allResidentsDb.forEach((res: any) => {
    if (res.id === selectedResident.id) return;
    const isConvocado = convocados.has(res.id);
    const capDate = deviceId ? res.caps[deviceId] : undefined;
    const isCapacitado = !!capDate && capDate <= fechaDB;
    const currentLocation = occupancies[res.id];
    const isBusy = !!currentLocation;
    const capInfo = capDate ? ` (Cap: ${capDate})` : '';
    const alt = { name: res.name, id: res.id, reason: isConvocado ? (currentLocation ? `Ocupado: ${currentLocation}` : "Libre") + capInfo : "Descanso" + capInfo, isBusy };

    if (isAgentAbsent(res.id, date)) return;
    if (isCapacitado && isConvocado) tier1.push(alt);
    else if (!isCapacitado && isConvocado) tier2.push(alt);
    else if (isCapacitado && !isConvocado) tier3.push(alt);
    else tier4.push(alt);
  });

  const handleSwap = async (newResId: number) => {
    if (isLoading) return;
    setIsLoading(true);

    const convId = (agentConvocatoriaMap && agentConvocatoriaMap[date] && agentConvocatoriaMap[date][newResId]) || null;

    if (isApertura) {
      // ---------------- APERTURA ----------------
      const { data: snapOriginal } = await supabase.from('menu')
        .select('id_menu, id_agente, id_dispositivo, estado_ejecucion, fecha_asignacion')
        .eq('id_agente', selectedResident.id)
        .eq('id_dispositivo', Number(disp?.id))
        .eq('fecha_asignacion', fechaDB)
        .limit(1)
        .maybeSingle();

      if (!snapOriginal) { 
        alert("No se encontró la asignación original para quitar."); 
        setIsLoading(false); 
        return; 
      }

      const { error: err1 } = await supabase.from('menu')
        .update({ id_dispositivo: 999 })
        .eq('id_menu', snapOriginal.id_menu);
        
      if (err1) { alert("Error al quitar original: " + err1.message); setIsLoading(false); return; }

      const { data: filaNew } = await supabase.from('menu')
        .select('id_menu')
        .eq('id_agente', newResId)
        .eq('fecha_asignacion', fechaDB)
        .limit(1)
        .maybeSingle();

      if (filaNew) {
        const { error: err2 } = await supabase.from('menu')
          .update({ id_dispositivo: Number(disp?.id) })
          .eq('id_menu', filaNew.id_menu);
        if (err2) { alert("Error al asignar nuevo: " + err2.message); }
      } else {
        const payload: any = { 
          id_agente: newResId, 
          id_dispositivo: Number(disp?.id), 
          fecha_asignacion: fechaDB, 
          estado_ejecucion: 'planificado' 
        };
        if (convId) payload.id_convocatoria = convId;
        
        const { error: err3 } = await supabase.from('menu').insert([payload]);
        if (err3) { alert("Error al insertar nuevo: " + err3.message); }
      }
      pushUndo({ snapshots: [snapOriginal, filaNew || { id_agente: newResId, fecha_asignacion: fechaDB, _isInsert: true, _table: 'menu' }] });
      
    } else {
      // ---------------- NON-APERTURA ----------------
      const { data: snapOriginal, error: fetchErr } = await supabase.from('menu_semana')
        .select('id_menu_semana, id_agente, id_dispositivo, estado_ejecucion, fecha_asignacion, id_turno, numero_grupo')
        .eq('id_agente', selectedResident.id)
        .eq('id_dispositivo', Number(disp?.id))
        .eq('fecha_asignacion', fechaDB)
        .limit(1)
        .maybeSingle();

      if (fetchErr || !snapOriginal) { 
        alert("No se encontró la asignación original para quitar."); 
        setIsLoading(false); 
        return; 
      }

      const { error: err1 } = await supabase.from('menu_semana')
        .update({ id_dispositivo: 999 })
        .eq('id_menu_semana', snapOriginal.id_menu_semana);
        
      if (err1) { alert("Error al quitar original: " + err1.message); setIsLoading(false); return; }

      const inheritedGroup = snapOriginal.numero_grupo;

      const { data: filaNew } = await supabase.from('menu_semana')
        .select('id_menu_semana')
        .eq('id_agente', newResId)
        .eq('fecha_asignacion', fechaDB)
        .eq('id_turno', snapOriginal.id_turno) // use exact turno of original
        .limit(1)
        .maybeSingle();

      if (filaNew) {
        const { error: err2 } = await supabase.from('menu_semana')
          .update({ 
            id_dispositivo: Number(disp?.id),
            ...(inheritedGroup != null ? { numero_grupo: inheritedGroup } : {})
          })
          .eq('id_menu_semana', filaNew.id_menu_semana);
        if (err2) { alert("Error al asignar nuevo: " + err2.message); }
      } else {
        const payload: any = {
          id_agente: newResId, 
          id_dispositivo: Number(disp?.id), 
          fecha_asignacion: fechaDB,
          estado_ejecucion: 'planificado', 
          id_turno: snapOriginal.id_turno
        };
        if (convId) payload.id_convocatoria = convId;
        if (inheritedGroup != null) payload.numero_grupo = inheritedGroup;
        const orgType = tipoOrganizacionMap && tipoOrganizacionMap[date] ? tipoOrganizacionMap[date] : 'rotacion_completa';
        payload.tipo_organizacion = orgType;
        
        const { error: err3 } = await supabase.from('menu_semana').insert([payload]);
        if (err3) { alert("Error al insertar nuevo: " + err3.message); }
      }
      pushUndo({ snapshots: [snapOriginal, filaNew || { id_agente: newResId, fecha_asignacion: fechaDB, _isInsert: true, _table: 'menu_semana', id_turno: snapOriginal.id_turno }] });
    }
    setSelectedResident(null);
    refresh();
  };

  const handleRemove = async () => {
    if (!confirm(`¿Quitar a ${selectedResident.name}?`)) return;
    setIsLoading(true);

    if (isApertura) {
      await supabase.from('menu').update({ id_dispositivo: 999 })
        .eq('id_agente', selectedResident.id).eq('id_dispositivo', Number(disp?.id)).eq('fecha_asignacion', fechaDB);
      pushUndo({ snapshot: { id_agente: selectedResident.id, fecha_asignacion: fechaDB, id_dispositivo: Number(disp?.id), estado_ejecucion: 'planificado' } });
    } else {
      const turnoId = dateTurnoMap[date] || 4;
      console.log(`[handleRemove] menu_semana: agente=${selectedResident.id} dispositivo=${Number(disp?.id)} fecha=${fechaDB} turno=${turnoId}`);

      // Fetch the specific row first to get its PK, avoiding turnoId fallback mismatch issues
      const { data: targetRow, error: fetchErr } = await supabase.from('menu_semana')
        .select('id_menu_semana, id_turno')
        .eq('id_agente', selectedResident.id)
        .eq('id_dispositivo', Number(disp?.id))
        .eq('fecha_asignacion', fechaDB)
        .limit(1)
        .maybeSingle();

      if (fetchErr) {
        console.error('[handleRemove] Error fetching row:', fetchErr);
        alert('Error al buscar la asignación: ' + fetchErr.message);
        setIsLoading(false);
        return;
      }

      if (!targetRow) {
        console.warn('[handleRemove] No row found for:', { agente: selectedResident.id, dispositivo: Number(disp?.id), fecha: fechaDB });
        alert('No se encontró la asignación para quitar. ¿Ya fue removida?');
        setIsLoading(false);
        return;
      }

      console.log(`[handleRemove] Found row id_menu_semana=${targetRow.id_menu_semana} id_turno=${targetRow.id_turno}`);

      const { error: updateErr } = await supabase.from('menu_semana')
        .update({ id_dispositivo: 999 })
        .eq('id_menu_semana', targetRow.id_menu_semana);

      if (updateErr) {
        alert('Error al quitar: ' + updateErr.message);
        setIsLoading(false);
        return;
      }

      pushUndo({ snapshot: { id_agente: selectedResident.id, fecha_asignacion: fechaDB, id_dispositivo: Number(disp?.id), estado_ejecucion: 'planificado', _table: 'menu_semana', id_turno: targetRow.id_turno } });
    }

    setSelectedResident(null);
    refresh();
  };

  const renderTier = (title: string, items: any[], colorClass: string, Icon: any) => (
    items.length > 0 && (
      <div className="mb-4">
        <span className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1 ${colorClass}`}>
          <Icon className="w-3 h-3" /> {title} ({items.length})
        </span>
        <div className="space-y-1.5">
          {items.map((alt, i) => (
            <button key={i} onClick={() => !alt.isBusy && handleSwap(alt.id)}
              className={`w-full text-left p-2.5 rounded-lg border-2 transition-all flex justify-between items-center ${alt.isBusy ? 'border-border bg-muted opacity-75 cursor-not-allowed' : 'border-emerald-200 bg-emerald-50 hover:border-emerald-400 cursor-pointer'}`}>
              <div>
                <div className="font-bold text-sm">{alt.name}</div>
                <div className="text-[10px] font-medium mt-0.5 opacity-80">{alt.reason}</div>
              </div>
              {alt.isBusy && <span className="text-xs bg-destructive/10 text-destructive p-1 px-2 rounded-md border border-destructive/20">🔒</span>}
            </button>
          ))}
        </div>
      </div>
    )
  );

  return (
    <div className="w-96 bg-card border-l border-border shadow-2xl flex flex-col absolute right-0 h-full z-50 overflow-hidden">
      <div className={`p-6 border-b ${getFloorColor(selectedResident.device)}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase mb-1 block opacity-80">Modificar Asignación</span>
            <h3 className="text-2xl font-bold">{selectedResident.name}</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={handleRemove} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold p-1 px-3 rounded text-xs shadow-sm flex items-center gap-1">
              <UserMinus className="w-3 h-3" /> Quitar
            </button>
            <button onClick={() => setSelectedResident(null)} className="opacity-70 hover:opacity-100 bg-card/20 p-1.5 rounded-md border border-border/30">✕</button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm bg-card/40 border border-border/50 px-3 py-2 rounded-lg shadow-sm font-medium">
          <Calendar className="w-4 h-4" /><span>{selectedResident.date}</span><span className="opacity-50">|</span><span className="truncate">{selectedResident.device}</span>
        </div>
      </div>
      <div className="p-6 flex-1 overflow-y-auto bg-card">
        <div className="bg-muted rounded-xl p-4 mb-6 border border-border">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Métricas de Rotación</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className={`text-2xl font-bold ${metrics.localReps <= 1 ? 'text-emerald-600' : metrics.localReps <= 2 ? 'text-amber-600' : 'text-destructive'}`}>
                {metrics.localReps}×
              </div>
              <div className="text-[10px] text-muted-foreground font-medium mt-0.5">en este disp.</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{metrics.uniqueDevices}</div>
              <div className="text-[10px] text-muted-foreground font-medium mt-0.5">disp. únicos</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${metrics.diversityPct >= avgDiversity ? 'text-emerald-600' : 'text-amber-600'}`}>
                {metrics.diversityPct}%
              </div>
              <div className="text-[10px] text-muted-foreground font-medium mt-0.5">diversidad</div>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground text-center">
            {metrics.totalAssignments} asignaciones totales · Media diversidad: {avgDiversity}%
          </div>
        </div>
        <h4 className="text-sm font-semibold mb-3 border-b border-border pb-2 flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-primary" /> Alternativas
        </h4>
        {renderTier("Capacitados y Convocados", tier1, "text-emerald-700", Check)}
        {renderTier("No Capacitados & Convocados", tier2, "text-amber-600", AlertCircle)}
        {renderTier("Capacitados & Descanso", tier3, "text-destructive", AlertCircle)}
        {tier4.length > 0 && <div className="text-[9px] text-muted-foreground">+ {tier4.length} no capacitados en descanso</div>}
      </div>
    </div>
  );
};
