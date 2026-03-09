import React from 'react';
import { Calendar, Check, AlertCircle, MapPin } from 'lucide-react';
import { VisitBlock } from './VisitBadge';

interface DateSidebarProps {
  selectedDate: string;
  setSelectedDateFilter: (d: string | null) => void;
  data: any;
  year: string;
}

export const DateSidebar: React.FC<DateSidebarProps> = ({
  selectedDate, setSelectedDateFilter, data, year,
}) => {
  const { allResidentsDb, convocadosDb, assignmentsDb, dbDevices, isAgentAbsent, visitasByDate, turnoFilter } = data;
  const convocadoIds = new Set(convocadosDb[selectedDate] || []);

  // Build occupancy map: agentId -> deviceName
  const occupancies: Record<number, string> = {};
  Object.entries(assignmentsDb[selectedDate] || {}).forEach(([devId, arr]: [string, any]) => {
    const devObj = dbDevices.find((d: any) => d.id === devId);
    arr.forEach((r: any) => { occupancies[r.id] = devObj ? devObj.name : 'Otro'; });
  });

  const convocados: { id: number; name: string; location: string | null; absent: boolean }[] = [];
  const noConvocados: { id: number; name: string }[] = [];

  allResidentsDb.forEach((res: any) => {
    if (convocadoIds.has(res.id)) {
      const absent = isAgentAbsent(res.id, selectedDate);
      convocados.push({
        id: res.id,
        name: res.name,
        location: occupancies[res.id] || null,
        absent,
      });
    } else {
      noConvocados.push({ id: res.id, name: res.name });
    }
  });

  convocados.sort((a, b) => a.name.localeCompare(b.name));
  noConvocados.sort((a, b) => a.name.localeCompare(b.name));

  const assigned = convocados.filter(c => c.location && !c.absent);
  const vacant = convocados.filter(c => !c.location && !c.absent);
  const absent = convocados.filter(c => c.absent);

  const visitas = visitasByDate?.[selectedDate] || [];

  return (
    <div className="w-96 bg-card border-l border-border shadow-2xl flex flex-col absolute right-0 h-full z-50 overflow-hidden">
      <div className="p-6 border-b bg-primary/10">
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase mb-1 block text-primary">
              <Calendar className="w-3 h-3 inline mr-1" />Fecha
            </span>
            <h3 className="text-xl font-bold text-foreground">{selectedDate}</h3>
          </div>
          <button onClick={() => setSelectedDateFilter(null)} className="opacity-70 hover:opacity-100 bg-card p-1.5 rounded-md border border-border">✕</button>
        </div>
        <p className="text-xs text-muted-foreground font-medium">
          {convocados.length} convocados — {noConvocados.length} en descanso
        </p>
      </div>
      <div className="p-5 flex-1 overflow-y-auto bg-card space-y-5">
        {/* Visitas Grupales */}
        {visitas.length > 0 && (
          <div>
            <VisitBlock visitas={visitas} interactive onGroupChange={() => data.refresh()} />
          </div>
        )}

        {/* Assigned */}
        <div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Check className="w-3 h-3" /> Asignados ({assigned.length})
          </span>
          <div className="space-y-1">
            {assigned.map(r => (
              <div key={r.id} className="p-2 rounded-lg border border-emerald-200 bg-emerald-50 flex justify-between items-center">
                <span className="font-bold text-xs text-emerald-900">{r.name}</span>
                <span className="text-[9px] font-mono bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />{r.location}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Vacant */}
        {vacant.length > 0 && (
          <div>
            <span className="text-xs font-bold text-destructive uppercase tracking-wider mb-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Vacantes ({vacant.length})
            </span>
            <div className="space-y-1">
              {vacant.map(r => (
                <div key={r.id} className="p-2 rounded-lg border border-destructive/20 bg-destructive/5">
                  <span className="font-bold text-xs text-destructive">{r.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Absent */}
        {absent.length > 0 && (
          <div>
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-2 flex items-center gap-1">
              🚫 Inasistentes ({absent.length})
            </span>
            <div className="space-y-1">
              {absent.map(r => (
                <div key={r.id} className="p-2 rounded-lg border border-stone-300 bg-stone-50 border-dashed">
                  <span className="font-medium text-xs text-stone-500 line-through">{r.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No convocados */}
        <div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            Descanso ({noConvocados.length})
          </span>
          <div className="space-y-1">
            {noConvocados.map(r => (
              <div key={r.id} className="p-2 rounded-lg border border-border bg-muted/20">
                <span className="font-medium text-xs text-muted-foreground">{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
