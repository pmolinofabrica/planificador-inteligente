import React, { useMemo } from 'react';
import { Calendar, Activity, ArrowRightLeft, Check, AlertCircle, UserMinus, BarChart3 } from 'lucide-react';
import { getFloorColor, getScoreColor, computeRotationMetrics } from '@/lib/floor-utils';
import { supabase } from '@/integrations/supabase/client';
import type { SelectedResident, AssignmentDataContext, UndoEntry } from '@/types/assignments';

interface ResidentSidebarProps {
  selectedResident: SelectedResident;
  setSelectedResident: (r: SelectedResident | null) => void;
  data: AssignmentDataContext;
  pushUndo: (entry: Omit<UndoEntry, '_timestamp'>) => void;
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
    computeRotationMetrics(selectedResident.id, deviceId, dbDevices.length, data.annualMetricsDb),
    [selectedResident.id, deviceId, dbDevices, data.annualMetricsDb]
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
      const m = computeRotationMetrics(aid, undefined, dbDevices.length, data.annualMetricsDb);
      total += m.diversityPct;
    }
    return Math.round(total / allAgentIds.size);
  }, [assignmentsDb, dbDevices.length, data.annualMetricsDb]);
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

    try {
      const convId = (agentConvocatoriaMap && agentConvocatoriaMap[date] && agentConvocatoriaMap[date][newResId]) || null;
      const resName = allResidentsDb.find(r => r.id === selectedResident.id)?.name || "Residente";
      const newResName = allResidentsDb.find(r => r.id === newResId)?.name || "Borrador";

      if (isApertura) {
        // Quitar original
        data.addAssignmentDraft({
          id: `remove-${selectedResident.id}-${fechaDB}-${data.turnoFilter}`,
          table: 'menu',
          action: 'update',
          matchParams: { id_agente: selectedResident.id, id_dispositivo: Number(disp?.id), fecha_asignacion: fechaDB },
          payload: { id_dispositivo: 999, _ui_name: resName },
          uiDate: date
        });

        // Poner nuevo
        data.addAssignmentDraft({
          id: `assign-${newResId}-${fechaDB}-${data.turnoFilter}`,
          table: 'menu',
          action: 'upsert',
          matchParams: { id_agente: newResId, fecha_asignacion: fechaDB },
          payload: { id_agente: newResId, id_dispositivo: Number(disp?.id), fecha_asignacion: fechaDB, estado_ejecucion: 'planificado', id_convocatoria: convId, _ui_name: newResName },
          uiDate: date
        });
      } else {
        const turnoId = dateTurnoMap[date];
        if (!turnoId) {
          alert(`No se pudo resolver id_turno para ${date}. Sin ese dato no se guarda para evitar inconsistencias.`);
          setIsLoading(false);
          return;
        }
        const orgType = (tipoOrganizacionMap && tipoOrganizacionMap[date]) || 'rotacion completa';

        // Quitar original
        data.addAssignmentDraft({
          id: `remove-${selectedResident.id}-${fechaDB}-${data.turnoFilter}`,
          table: 'menu_semana',
          action: 'update',
          matchParams: { id_agente: selectedResident.id, id_dispositivo: Number(disp?.id), fecha_asignacion: fechaDB, id_turno: turnoId },
          payload: { id_dispositivo: 999, _ui_name: resName },
          uiDate: date
        });

        // Poner nuevo
        data.addAssignmentDraft({
          id: `assign-${newResId}-${fechaDB}-${data.turnoFilter}`,
          table: 'menu_semana',
          action: 'upsert',
          matchParams: { id_agente: newResId, fecha_asignacion: fechaDB, id_turno: turnoId },
          payload: { 
            id_agente: newResId, id_dispositivo: Number(disp?.id), fecha_asignacion: fechaDB, 
            estado_ejecucion: 'planificado', id_convocatoria: convId, id_turno: turnoId,
            tipo_organizacion: orgType, _ui_name: newResName
          },
          uiDate: date
        });
      }
      setSelectedResident(null);
      setIsLoading(false);
    } catch (err: any) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm(`¿Quitar a ${selectedResident.name}?`)) return;
    setIsLoading(true);
    
    try {
      const turnoId = isApertura ? null : dateTurnoMap[date];
      if (!isApertura && !turnoId) {
        alert(`No se pudo resolver id_turno para ${date}. Sin ese dato no se guarda para evitar inconsistencias.`);
        setIsLoading(false);
        return;
      }
      data.addAssignmentDraft({
        id: `remove-${selectedResident.id}-${fechaDB}-${data.turnoFilter}`,
        table: isApertura ? 'menu' : 'menu_semana',
        action: 'update',
        matchParams: { 
          id_agente: selectedResident.id, 
          fecha_asignacion: fechaDB,
          ...(isApertura ? {} : { id_turno: turnoId }) 
        },
        payload: { id_dispositivo: 999, _ui_name: selectedResident.name },
        uiDate: date
      });
      
      setSelectedResident(null);
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
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
              <div className="flex items-center gap-2">
                {deviceId && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-primary/20 bg-primary/10 text-primary whitespace-nowrap">
                    Coord: {data.aperturaMetricsDb?.[alt.id]?.deviceReps?.[deviceId] || 0}
                  </span>
                )}
                {alt.isBusy && <span className="text-xs bg-destructive/10 text-destructive p-1 px-2 rounded-md border border-destructive/20 whitespace-nowrap">🔒</span>}
              </div>
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
