import React from 'react';
import { AlertCircle, ArrowRightLeft } from 'lucide-react';
import { getPisoBadgeColor } from '@/lib/floor-utils';
import type { SelectedVacant, SelectedDevice, SelectedResident } from '@/types/assignments';

interface VacantsSidebarProps {
  data: any;
  selectedVacant: SelectedVacant | null;
  setSelectedVacant: (v: SelectedVacant | null) => void;
  setSelectedDevice: (d: SelectedDevice | null) => void;
  setSelectedResident: (r: SelectedResident | null) => void;
  setShowVacantsSidebar: (v: boolean) => void;
  year: string;
}

export const VacantsSidebar: React.FC<VacantsSidebarProps> = ({
  data, selectedVacant, setSelectedVacant, setSelectedDevice, setSelectedResident, setShowVacantsSidebar, year,
}) => {
  const { activeDates, assignmentsDb, convocadosDb, allResidentsDb, dbDevices, isAgentAbsent } = data;

  return (
    <div className="w-96 bg-card border-r border-border shadow-2xl flex flex-col absolute left-0 h-full z-50 overflow-hidden">
      <div className="p-6 border-b border-destructive/20 bg-destructive/5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[10px] flex items-center gap-1 font-bold tracking-wider uppercase mb-1 text-destructive">
              <AlertCircle className="w-3 h-3" /> Atención Requerida
            </span>
            <h3 className="text-2xl font-bold text-destructive">Residentes Vacantes</h3>
          </div>
          <button onClick={() => setShowVacantsSidebar(false)} className="opacity-70 text-destructive hover:opacity-100 bg-card p-1 rounded-md border border-destructive/20">✕</button>
        </div>
        <p className="text-xs text-destructive/80 font-medium">Convocados sin dispositivo asignado.</p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto bg-card space-y-4">
        {activeDates.map((date: string, idx: number) => {
          const assignedIds = new Set<number>();
          Object.values(assignmentsDb[date] || {}).forEach((arr: any) => arr.forEach((r: any) => assignedIds.add(r.id)));
          const convocados = convocadosDb[date] || [];
          const vacantes = convocados.filter((id: number) => !assignedIds.has(id));
          if (vacantes.length === 0) return null;

          return (
            <div key={idx} className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted px-3 py-2 border-b border-border font-bold text-sm text-foreground flex justify-between items-center">
                {date}
                <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded-full text-xs shadow-sm">{vacantes.length} sueltos</span>
              </div>
              <div className="p-2 space-y-2 bg-card">
                {vacantes.map((vid: number) => {
                  const res = allResidentsDb.find((r: any) => r.id === vid);
                  if (!res) return null;
                  const fechaDB = `${year}-${date.split("/")[1]}-${date.split("/")[0]}`;
                  const pisosCap: Record<string, number> = {};
                  Object.keys(res.caps).forEach((dId: string) => {
                    if (res.caps[dId] > fechaDB) return;
                    const dObj = dbDevices.find((dev: any) => dev.id === dId);
                    if (dObj) {
                      const match = dObj.name.match(/\(P\d+\)/);
                      const pisoName = match ? match[0].replace('(', '').replace(')', '') : 'P?';
                      pisosCap[pisoName] = (pisosCap[pisoName] || 0) + 1;
                    }
                  });

                  return (
                    <button key={`${date}-${vid}`}
                      onClick={() => { setSelectedVacant({ id: res.id, name: res.name, date }); setSelectedDevice(null); setSelectedResident(null); }}
                      className={`w-full text-left p-3 rounded-xl border transition-all shadow-sm ${
                        selectedVacant?.id === res.id && selectedVacant?.date === date
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/5 scale-[1.02]'
                          : 'border-border bg-card hover:border-primary/40 hover:shadow-md'
                      }`}>
                      <div className="font-bold text-sm text-foreground mb-1.5 flex items-center justify-between">
                        {res.name}
                        <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {Object.keys(pisosCap).length === 0
                          ? <span className="bg-muted text-destructive px-1.5 py-0.5 text-[9px] rounded font-bold border border-destructive/20">Sin caps</span>
                          : Object.entries(pisosCap).map(([piso, count]) => (
                            <span key={piso} className={`${getPisoBadgeColor(piso)} shadow-sm px-1.5 py-0.5 text-[9px] rounded font-bold border`}>
                              {piso}: {count} Disp.
                            </span>
                          ))}
                      </div>
                    </button>
                      );
                    })()}
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
