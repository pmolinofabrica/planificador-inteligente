import React from 'react';
import { getFloorColor } from '@/lib/floor-utils';
import { supabase } from '@/integrations/supabase/client';
import type { SelectedVacant } from '@/types/assignments';

interface VacantActionSidebarProps {
  selectedVacant: SelectedVacant;
  setSelectedVacant: (v: SelectedVacant | null) => void;
  data: any;
  year: string;
}

export const VacantActionSidebar: React.FC<VacantActionSidebarProps> = ({
  selectedVacant, setSelectedVacant, data, year,
}) => {
  const { dbDevices, allResidentsDb, assignmentsDb, calendarDb, isLoading, setIsLoading, refresh } = data;
  const res = allResidentsDb.find((r: any) => r.id === selectedVacant.id);
  if (!res) return null;

  const [d, mStr] = selectedVacant.date.split("/");
  const fechaDB = `${year}-${mStr.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const assignmentsOfDate = assignmentsDb[selectedVacant.date] || {};
  const cuposDelDia = calendarDb[selectedVacant.date] || {};

  const devCapacitados = dbDevices.filter((dev: any) => {
    const capDate = res.caps[dev.id];
    return capDate && capDate <= fechaDB;
  });
  const devNoCapacitados = dbDevices.filter((dev: any) => !devCapacitados.find((dc: any) => dc.id === dev.id));

  const handleAssign = async (deviceId: string) => {
    if (isLoading) return;
    setIsLoading(true);
    const { data: existing } = await supabase.from('menu').select('*')
      .eq('id_agente', selectedVacant.id).eq('fecha_asignacion', fechaDB);

    const vacanteRow = existing?.find((m: any) => m.id_dispositivo === 999);
    if (vacanteRow) {
      await supabase.from('menu').update({ id_dispositivo: parseInt(deviceId) })
        .eq('id_agente', selectedVacant.id).eq('fecha_asignacion', fechaDB).eq('id_dispositivo', 999);
    } else if (existing && existing.length > 0) {
      await supabase.from('menu').update({ id_dispositivo: parseInt(deviceId) })
        .eq('id_agente', selectedVacant.id).eq('fecha_asignacion', fechaDB);
    } else {
      await supabase.from('menu').insert([{ id_agente: selectedVacant.id, id_dispositivo: parseInt(deviceId), fecha_asignacion: fechaDB, estado_ejecucion: 'planificado', id_convocatoria: 0 }]);
    }
    setSelectedVacant(null);
    refresh();
  };

  return (
    <div className="w-96 bg-card border-l border-border shadow-2xl flex flex-col absolute right-0 h-full z-50 overflow-hidden">
      <div className="p-6 border-b bg-primary/10">
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase mb-1 block text-primary">Ubicar Vacante</span>
            <h3 className="text-2xl font-bold text-foreground">{selectedVacant.name}</h3>
          </div>
          <button onClick={() => setSelectedVacant(null)} className="opacity-70 hover:opacity-100 bg-card p-1.5 rounded-md border border-border">✕</button>
        </div>
        <span className="text-sm font-medium text-muted-foreground">{selectedVacant.date}</span>
      </div>
      <div className="p-6 flex-1 overflow-y-auto bg-card">
        <div className="mb-4">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1">
            ✓ Capacitado ({devCapacitados.length})
          </span>
          {devCapacitados.length === 0 ? (
            <div className="text-xs text-muted-foreground italic p-2">Sin dispositivos capacitados.</div>
          ) : (
            <div className="space-y-1.5">
              {devCapacitados.map((dev: any) => (
                <button key={dev.id} onClick={() => handleAssign(dev.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${getFloorColor(dev.name)} hover:ring-2 hover:ring-primary/30 cursor-pointer`}>
                  <div className="font-bold text-sm">{dev.name}</div>
                  <div className="text-[10px] font-medium mt-1 opacity-80">
                    Ocupación: {assignmentsOfDate[dev.id]?.length || 0} de {cuposDelDia[dev.id] || 0}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mb-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            ⚠ No Capacitado ({devNoCapacitados.length})
          </span>
          <div className="space-y-1.5">
            {devNoCapacitados.map((dev: any) => (
              <button key={dev.id} onClick={() => handleAssign(dev.id)}
                className="w-full text-left p-2.5 rounded-md border border-border bg-muted/50 hover:bg-accent transition-all cursor-pointer">
                <div className="font-medium text-xs text-muted-foreground">{dev.name}</div>
                <div className="text-[9px] text-muted-foreground/70 mt-0.5">
                  Ocupación: {assignmentsOfDate[dev.id]?.length || 0} de {cuposDelDia[dev.id] || 0}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
