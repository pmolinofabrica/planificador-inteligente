import React from 'react';
import { Calendar, Users, AlertCircle } from 'lucide-react';
import { getFloorColor, getScoreColor } from '@/lib/floor-utils';
import type { SelectedResident, SelectedDevice } from '@/types/assignments';

interface PlanningMatrixProps {
  data: any;
  selectedResident: SelectedResident | null;
  setSelectedResident: (r: SelectedResident | null) => void;
  selectedDevice: SelectedDevice | null;
  setSelectedDevice: (d: SelectedDevice | null) => void;
  selectedDateFilter: string | null;
  setSelectedDateFilter: (d: string | null) => void;
  showVacantsSidebar: boolean;
  setShowVacantsSidebar: (v: boolean) => void;
  year: string;
}

export const PlanningMatrix: React.FC<PlanningMatrixProps> = ({
  data, selectedResident, setSelectedResident,
  selectedDevice, setSelectedDevice,
  selectedDateFilter, setSelectedDateFilter,
  showVacantsSidebar, setShowVacantsSidebar,
  year,
}) => {
  const { dbDevices, activeDates, assignmentsDb, calendarDb, convocadosCountDb, convocadosDb, agentGroups, isAgentAbsent } = data;

  return (
    <main className="flex-1 overflow-auto bg-muted/30 absolute inset-0">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
              <Calendar className="w-8 h-8 text-primary" />
              Matriz de Planificación
            </h2>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              Dispositivos × Fechas — Click en celda para ver dispositivo, click en tarjeta para modificar residente
            </p>
          </div>
          <button
            onClick={() => setShowVacantsSidebar(!showVacantsSidebar)}
            className="bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 font-bold px-4 py-2 rounded-xl transition-colors text-sm flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            Ver Vacantes / Sin Asignar
          </button>
        </div>

        {/* Matrix Table */}
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-muted p-3 border-b border-r border-border font-bold text-sm text-foreground min-w-[200px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    Dispositivo
                  </th>
                  {activeDates.map((d: string) => {
                    const count = convocadosCountDb[d] || 0;
                    // Calculate free & vacant
                    const assignedIds = new Set<number>();
                    Object.values(assignmentsDb[d] || {}).forEach((arr: any) => {
                      arr.forEach((r: any) => assignedIds.add(r.id));
                    });
                    const convocados = convocadosDb[d] || [];
                    const free = convocados.filter((id: number) => !assignedIds.has(id)).length;
                    let totalCupos = 0;
                    dbDevices.forEach((dev: any) => {
                      totalCupos += calendarDb[d]?.[dev.id] || 0;
                    });
                    const vacant = totalCupos - assignedIds.size;

                    return (
                      <th
                        key={d}
                        onClick={() => setSelectedDateFilter(selectedDateFilter === d ? null : d)}
                        className={`p-3 border-b border-r border-border font-bold text-xs text-center min-w-[130px] cursor-pointer transition-colors ${
                          selectedDateFilter === d ? 'bg-primary/10 ring-2 ring-primary/30' : 'bg-muted/50 hover:bg-accent'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="text-foreground">{d}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-bold">
                              <Users className="w-3 h-3 inline mr-0.5" />{count}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            {free > 0 && <span className="score-low border px-1 py-0.5 rounded text-[9px] font-bold">{free} LIBR.</span>}
                            {vacant > 0 && <span className="score-high border px-1 py-0.5 rounded text-[9px] font-bold">{vacant} VAC.</span>}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {dbDevices.map((device: any) => (
                  <tr key={device.id} className="border-b border-border hover:bg-accent/30 transition-colors group">
                    <td
                      onClick={() => { setSelectedDevice(device); setSelectedResident(null); }}
                      className={`px-4 py-3 border-r border-border cursor-pointer transition-colors whitespace-normal break-words text-xs ${getFloorColor(device.name)} ${
                        selectedDevice?.id === device.id ? 'ring-2 ring-inset ring-primary font-bold' : 'font-semibold'
                      }`}
                    >
                      {device.name}
                      <div className="text-[9px] font-mono text-muted-foreground mt-1 uppercase tracking-widest opacity-80">
                        Rango: {device.min}-{device.max}
                      </div>
                    </td>

                    {activeDates.map((date: string) => {
                      const assignments = assignmentsDb[date]?.[device.id] || [];
                      const current = assignments.length;
                      const isUnderMin = current < device.min;
                      const isOverMax = current > device.max;

                      let statusClass = '';
                      if (isUnderMin) statusClass = 'bg-destructive/5 border-destructive/20';
                      else if (isOverMax) statusClass = 'bg-amber-50 border-amber-200';
                      else if (current > 0) statusClass = 'bg-emerald-50 border-emerald-200';
                      else statusClass = 'bg-muted/30 border-border';

                      return (
                        <td key={date} className="px-1.5 py-1.5 border-r border-border align-top">
                          <div
                            onClick={() => { setSelectedDevice(device); setSelectedDateFilter(date); setSelectedResident(null); }}
                            className={`flex flex-col gap-1.5 p-1 rounded-md cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all min-h-[4rem] h-full ${statusClass}`}
                          >
                            {assignments.length === 0 ? (
                              <div className="text-center text-muted-foreground/40 text-sm font-mono mt-2">—</div>
                            ) : (
                              assignments.map((res: any, idx: number) => {
                                const absent = isAgentAbsent(res.id, date);
                                return (
                                  <div
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedResident({ id: res.id, name: res.name, score: res.score, device: device.name, date });
                                      setSelectedDevice(null);
                                    }}
                                    className={`text-left px-2 py-1.5 rounded border text-sm flex justify-between items-center transition-all cursor-pointer
                                      ${absent ? 'bg-stone-100 text-stone-600 border-stone-400 border-dashed' : getScoreColor(res.score)}
                                      ${selectedResident?.name === res.name && selectedResident?.date === date ? 'ring-2 ring-primary shadow-md scale-[1.03] z-10 font-bold' : 'hover:scale-[1.02] hover:shadow-sm'}`
                                    }
                                  >
                                    <span className={`font-bold truncate max-w-[100px] text-xs ${
                                      absent ? 'line-through text-stone-500 opacity-60'
                                      : agentGroups[res.id] === 'A' ? 'text-indigo-900 border-b-2 border-indigo-400'
                                      : agentGroups[res.id] === 'B' ? 'text-rose-900 border-b-2 border-rose-400'
                                      : ''
                                    }`}>
                                      {absent && <span className="mr-1">🚫</span>}{res.name}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
};
