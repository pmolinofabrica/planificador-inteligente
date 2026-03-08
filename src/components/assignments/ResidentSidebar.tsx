import React from 'react';
import { Calendar, Activity, ArrowRightLeft, Check, AlertCircle, UserMinus } from 'lucide-react';
import { getFloorColor, getScoreColor } from '@/lib/floor-utils';
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
  const { dbDevices, allResidentsDb, assignmentsDb, convocadosDb, isAgentAbsent, getAbsenceMotivo, isLoading, setIsLoading, refresh } = data;
  const disp = dbDevices.find((d: any) => d.name === selectedResident.device);
  const deviceId = disp?.id;
  const date = selectedResident.date;
  const convocados = new Set(convocadosDb[date] || []);

  const occupancies: Record<number, string> = {};
  Object.entries(assignmentsDb[date] || {}).forEach(([devIdStr, arr]: [string, any]) => {
    const devObj = dbDevices.find((d: any) => d.id === devIdStr);
    arr.forEach((r: any) => { occupancies[r.id] = devObj ? devObj.name : 'Otro'; });
  });

  const tier1: any[] = [], tier2: any[] = [], tier3: any[] = [], tier4: any[] = [];

  allResidentsDb.forEach((res: any) => {
    if (res.id === selectedResident.id) return;
    const isConvocado = convocados.has(res.id);
    const isCapacitado = deviceId ? !!res.caps[deviceId] : false;
    const currentLocation = occupancies[res.id];
    const isBusy = !!currentLocation;
    const alt = { name: res.name, id: res.id, reason: isConvocado ? (currentLocation ? `Ocupado: ${currentLocation}` : "Libre") : "Descanso", isBusy };

    if (isAgentAbsent(res.id, date)) return;
    if (isCapacitado && isConvocado) tier1.push(alt);
    else if (!isCapacitado && isConvocado) tier2.push(alt);
    else if (isCapacitado && !isConvocado) tier3.push(alt);
    else tier4.push(alt);
  });

  const handleSwap = async (newResId: number) => {
    if (isLoading) return;
    setIsLoading(true);
    const [d, mStr] = selectedResident.date.split("/");
    const fechaDB = `${year}-${mStr.padStart(2, '0')}-${d.padStart(2, '0')}`;

    const { data: snapOriginal } = await supabase.from('menu')
      .select('id_agente, id_dispositivo, estado_ejecucion, fecha_asignacion')
      .eq('id_agente', selectedResident.id).eq('id_dispositivo', Number(disp?.id)).eq('fecha_asignacion', fechaDB)
      .maybeSingle();

    if (!snapOriginal) { alert("No se encontró la asignación original."); setIsLoading(false); return; }

    await supabase.from('menu').update({ id_dispositivo: 999 })
      .eq('id_agente', selectedResident.id).eq('id_dispositivo', Number(disp?.id)).eq('fecha_asignacion', fechaDB);

    const { data: filaNew } = await supabase.from('menu').select('*')
      .eq('id_agente', newResId).eq('fecha_asignacion', fechaDB).maybeSingle();

    if (filaNew) {
      await supabase.from('menu').update({ id_dispositivo: Number(disp?.id) })
        .eq('id_agente', newResId).eq('fecha_asignacion', fechaDB);
      pushUndo({ snapshots: [snapOriginal, filaNew] });
    } else {
      await supabase.from('menu').insert([{ id_agente: newResId, id_dispositivo: Number(disp?.id), fecha_asignacion: fechaDB, estado_ejecucion: 'planificado', id_convocatoria: 0 }]);
      pushUndo({ snapshots: [snapOriginal, { id_agente: newResId, fecha_asignacion: fechaDB, _isInsert: true }] });
    }
    setSelectedResident(null);
    refresh();
  };

  const handleRemove = async () => {
    if (!confirm(`¿Quitar a ${selectedResident.name}?`)) return;
    setIsLoading(true);
    const [d, mStr] = selectedResident.date.split("/");
    const fechaDB = `${year}-${mStr.padStart(2, '0')}-${d.padStart(2, '0')}`;
    await supabase.from('menu').update({ id_dispositivo: 999 })
      .eq('id_agente', selectedResident.id).eq('id_dispositivo', Number(disp?.id)).eq('fecha_asignacion', fechaDB);
    pushUndo({ snapshot: { id_agente: selectedResident.id, fecha_asignacion: fechaDB, id_dispositivo: Number(disp?.id), estado_ejecucion: 'planificado' } });
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
          <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2"><Activity className="w-4 h-4" /> Score</h4>
          <span className={`text-3xl font-bold ${selectedResident.score >= 900 ? 'text-emerald-600' : 'text-amber-600'}`}>{selectedResident.score} pts</span>
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
