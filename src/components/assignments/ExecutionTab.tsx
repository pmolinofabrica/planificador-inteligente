import React, { useState } from 'react';
import { Users, UserPlus, AlertCircle, ArrowRightLeft, UserMinus, Settings, Monitor } from 'lucide-react';
import { getFloorColor, getScoreColor } from '@/lib/floor-utils';
import { supabase } from '@/integrations/supabase/client';
import type { SelectedResident, SelectedVacant } from '@/types/assignments';
import { AperturaDevicesPanel } from './AperturaDevicesPanel';

interface ExecutionTabProps {
  data: any;
  execDate: string;
  setExecDate: (d: string) => void;
  selectedResident: SelectedResident | null;
  setSelectedResident: (r: SelectedResident | null) => void;
  selectedVacant: SelectedVacant | null;
  setSelectedVacant: (v: SelectedVacant | null) => void;
  setShowVacantsSidebar: (v: boolean) => void;
  pushUndo: (entry: any) => void;
  year: string;
}

export const ExecutionTab: React.FC<ExecutionTabProps> = ({
  data, execDate, setExecDate,
  selectedResident, setSelectedResident,
  selectedVacant, setSelectedVacant,
  setShowVacantsSidebar, pushUndo, year,
}) => {
  const {
    dbDevices, activeDates, assignmentsDb, convocadosDb,
    allResidentsDb, isAgentAbsent, getAbsenceMotivo,
    dateTurnoMap, isLoading, setIsLoading, refresh
  } = data;

  const [subTab, setSubTab] = useState<'kanban' | 'devices'>('kanban');

  const handleQuitar = async (resId: number, deviceId: string) => {
    if (isLoading) return;
    if (!confirm("¿Quitar residente de este dispositivo?")) return;
    setIsLoading(true);
    const [d, mStr] = execDate.split("/");
    const fechaDB = `${year}-${mStr}-${d}`;

    const { error } = await supabase.from('menu')
      .update({ id_dispositivo: 999, estado_ejecucion: 'planificado' })
      .eq('id_agente', resId)
      .eq('fecha_asignacion', fechaDB)
      .eq('id_dispositivo', parseInt(deviceId));

    if (error) {
      alert("Error: " + error.message);
      setIsLoading(false);
    } else {
      pushUndo({
        snapshot: {
          id_agente: resId,
          fecha_asignacion: fechaDB,
          id_dispositivo: Number(deviceId),
          estado_ejecucion: 'planificado'
        }
      });
      refresh();
    }
  };

  // Compute free residents (convocados sin dispositivo asignado, excluding absent)
  const assignedIds = new Set<number>();
  Object.values(assignmentsDb[execDate] || {}).forEach((arr: any) => {
    arr.forEach((r: any) => assignedIds.add(r.id));
  });
  const convocados = convocadosDb[execDate] || [];
  const unassignedResidents = allResidentsDb.filter((r: any) =>
    convocados.includes(r.id) && !assignedIds.has(r.id)
  );
  const freeResidents = unassignedResidents.filter((r: any) => !isAgentAbsent(r.id, execDate));
  const absentUnassigned = unassignedResidents.filter((r: any) => isAgentAbsent(r.id, execDate));

  return (
    <main className="flex-1 overflow-auto bg-muted/30 absolute inset-0 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
              <Users className="w-8 h-8 text-destructive" />
              Apertura / Inasistencias
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="bg-card border border-border rounded-xl px-4 py-2 text-sm font-bold text-foreground"
              value={execDate}
              onChange={(e) => setExecDate(e.target.value)}
            >
              {activeDates.map((d: string) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Kanban Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* P0: Sin Asignar */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-sm overflow-hidden flex flex-col md:col-span-2 lg:col-span-1">
            <div className="px-4 py-3 bg-amber-100 border-b border-amber-200 flex items-center justify-between">
              <h4 className="font-bold text-sm text-amber-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Sin Asignar
              </h4>
              <div className="flex gap-1">
                {absentUnassigned.length > 0 && (
                  <span className="bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full text-xs font-bold">🚫 {absentUnassigned.length}</span>
                )}
                <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full text-xs font-bold">
                  {freeResidents.length}
                </span>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto max-h-[500px]">
              {freeResidents.length === 0 && absentUnassigned.length === 0 ? (
                <div className="text-center text-amber-600/60 text-sm py-8 italic">
                  Todos los convocados tienen dispositivo asignado ✓
                </div>
              ) : (
                <>
                  {freeResidents.map((res: any) => (
                    <div
                      key={res.id}
                      onClick={() => { setSelectedVacant({ id: res.id, name: res.name, date: execDate }); setShowVacantsSidebar(true); }}
                      className="flex flex-col gap-2 p-3 rounded-xl border bg-card border-amber-300 shadow-sm hover:shadow transition-all cursor-pointer hover:border-primary/50"
                    >
                      <span className="font-bold text-sm text-foreground">{res.name}</span>
                      <button className="w-full flex items-center justify-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-800 text-[10px] uppercase tracking-wider font-bold py-1.5 rounded-lg">
                        Asignar
                      </button>
                    </div>
                  ))}
                  {absentUnassigned.length > 0 && (
                    <div className="border-t border-stone-200 pt-3 mt-1">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 block">🚫 Ausentes ({absentUnassigned.length})</span>
                      {absentUnassigned.map((res: any) => (
                        <div key={res.id} className="p-2.5 rounded-xl border border-dashed border-stone-300 bg-stone-50 mb-1.5">
                          <span className="font-bold text-sm text-stone-400 line-through">{res.name}</span>
                          <span className="text-[9px] ml-2 bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded font-bold">AUSENTE</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="mt-auto pt-4 border-t border-amber-200/50">
                <button className="w-full flex items-center justify-center gap-2 bg-card border-2 border-border text-muted-foreground hover:border-primary/50 hover:bg-accent hover:text-primary text-xs font-bold py-2 rounded-xl transition-colors shadow-sm">
                  <UserPlus className="w-4 h-4" /> Buscar en "Descansos"
                </button>
              </div>
            </div>
          </div>

          {/* Device Cards */}
          {dbDevices.map((device: any) => {
            const assignments = assignmentsDb[execDate]?.[device.id] || [];
            if (assignments.length === 0) return null;

            return (
              <div key={device.id} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className={`px-4 py-3 border-b border-border flex items-center justify-between ${getFloorColor(device.name)}`}>
                  <h4 className="font-bold text-sm truncate flex-1 leading-snug">{device.name}</h4>
                </div>
                <div className="p-4 flex-1 flex flex-col gap-3">
                  {assignments.map((res: any, i: number) => {
                    const isAbsent = isAgentAbsent(res.id, execDate);
                    return (
                      <div key={`${res.id}-${i}`} className={`flex flex-col gap-2 p-3 rounded-xl border transition-colors ${
                        isAbsent ? 'bg-stone-50 border-stone-300 border-dashed' : 'bg-muted/30 border-border'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className={`font-bold text-sm ${isAbsent ? 'text-stone-500 line-through opacity-70' : 'text-foreground'}`}>
                              {res.name}
                            </span>
                            {isAbsent && <span className="text-[10px] text-stone-500 font-bold mt-0.5">MARCADO AUSENTE</span>}
                          </div>
                          <button
                            onClick={() => handleQuitar(res.id, device.id)}
                            className="text-[10px] px-2 py-1 rounded-md font-bold transition-colors border bg-card text-muted-foreground border-border hover:text-destructive hover:border-destructive/50 shadow-sm"
                          >
                            Quitar
                          </button>
                        </div>
                        {!isAbsent && (
                          <button
                            onClick={() => setSelectedResident({ id: res.id, name: res.name, score: res.score, device: device.name, date: execDate })}
                            className="mt-1 w-full flex items-center justify-center gap-1.5 bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-accent text-[10px] uppercase tracking-wider font-bold py-1.5 rounded-lg transition-colors shadow-sm"
                          >
                            <ArrowRightLeft className="w-3 h-3" /> Cambiar Residente
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
};
