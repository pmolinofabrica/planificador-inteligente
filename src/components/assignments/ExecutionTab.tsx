import React, { useState, useMemo, useEffect } from 'react';
import { Users, AlertCircle, X as XIcon } from 'lucide-react';
import { getPisoFromDeviceName, getGroupColor } from '@/lib/floor-utils';
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
  setSelectedDevice: (d: { id: string; name: string; date: string } | null) => void;
  setSelectedDateFilter: (d: string | null) => void;
  showCapacitadosColors?: boolean;
  showPisoColors?: boolean;
}

const floorNames: Record<string, { label: string; bgClass: string; borderClass: string }> = {
  '1': { label: 'P1', bgClass: 'bg-[hsl(var(--floor-1-accent))]', borderClass: 'border-[hsl(var(--floor-1-accent))]' },
  '2': { label: 'P2', bgClass: 'bg-[hsl(var(--floor-2-accent))]', borderClass: 'border-[hsl(var(--floor-2-accent))]' },
  '3': { label: 'P3', bgClass: 'bg-[hsl(var(--floor-3-accent))]', borderClass: 'border-[hsl(var(--floor-3-accent))]' },
  '4': { label: 'P4', bgClass: 'bg-muted-foreground', borderClass: 'border-muted-foreground' },
};

export const ExecutionTab: React.FC<ExecutionTabProps> = ({
  data, execDate, setExecDate,
  selectedResident, setSelectedResident,
  selectedVacant, setSelectedVacant,
  setShowVacantsSidebar, pushUndo, year,
  setSelectedDevice, setSelectedDateFilter,
  showCapacitadosColors = true, showPisoColors = false,
}) => {
  const { activeDates, allResidentsDb, convocadosDb, assignmentsDb, dbDevices, isAgentAbsent, visitasByDate, tipoOrganizacionMap, turnoFilter } = data;
  const [showConvocados, setShowConvocados] = useState(false);
  const [visibleGroups, setVisibleGroups] = useState<Record<number, boolean>>({});

  // Active groups for current date (from visitas + actual assignments)
  const activeGroups = useMemo(() => {
    const orgType = tipoOrganizacionMap?.[execDate] || 'dispositivos fijos';
    const isRotation = orgType.includes('rotacion');
    if (turnoFilter === 'apertura' || !isRotation) return [];
    const groups = new Set<number>();
    (visitasByDate?.[execDate] || []).forEach((v: any) => {
      (v.numero_grupo || []).forEach((g: number) => {
        if (g >= 1 && g <= 3) groups.add(g);
      });
    });
    // Also collect groups from actual resident assignments
    Object.values(assignmentsDb[execDate] || {}).forEach((residents: any) => {
      (residents || []).forEach((r: any) => {
        const gs = Array.isArray(r.numero_grupos) ? r.numero_grupos : (r.numero_grupo != null ? [r.numero_grupo] : []);
        gs.forEach((g: number) => { if (g >= 1 && g <= 3) groups.add(g); });
      });
    });
    const sorted = Array.from(groups).sort((a, b) => a - b);
    return sorted.length > 0 ? sorted : [1];
  }, [tipoOrganizacionMap, execDate, visitasByDate, turnoFilter, assignmentsDb]);

  // Initialize visibleGroups when activeGroups change
  useEffect(() => {
    setVisibleGroups(prev => {
      const next = { ...prev };
      activeGroups.forEach(g => { if (next[g] === undefined) next[g] = true; });
      return next;
    });
  }, [activeGroups]);

  const convocadoIds = new Set(convocadosDb[execDate] || []);

  const isRotation = turnoFilter !== 'apertura' && (tipoOrganizacionMap?.[execDate] || '').includes('rotacion');

  // Floor counts per convocado + group info
  const convocadosWithFloors = useMemo(() => {
    const floorCounts: Record<number, Record<string, number>> = {};
    const groupMap: Record<number, number[]> = {};
    Object.entries(assignmentsDb[execDate] || {}).forEach(([devId, residents]: [string, any]) => {
      const dev = dbDevices.find((d: any) => d.id === devId);
      if (!dev) return;
      const piso = getPisoFromDeviceName(dev.name);
      residents.forEach((r: any) => {
        if (!floorCounts[r.id]) floorCounts[r.id] = { '1': 0, '2': 0, '3': 0, '4': 0 };
        floorCounts[r.id][piso] = (floorCounts[r.id][piso] || 0) + 1;
        const gs = Array.isArray(r.numero_grupos) ? r.numero_grupos : (r.numero_grupo != null ? [r.numero_grupo] : []);
        if (!groupMap[r.id]) groupMap[r.id] = [];
        gs.forEach((g: number) => { if (g >= 1 && g <= 3 && !groupMap[r.id].includes(g)) groupMap[r.id].push(g); });
      });
    });

    return (allResidentsDb || [])
      .filter((r: any) => convocadoIds.has(r.id))
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        counts: floorCounts[r.id] || { '1': 0, '2': 0, '3': 0, '4': 0 },
        groups: (groupMap[r.id] || []).sort((a, b) => a - b),
        isAbsent: isAgentAbsent ? isAgentAbsent(r.id, execDate) : false,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [allResidentsDb, convocadoIds, assignmentsDb, execDate, dbDevices, isAgentAbsent]);

  return (
    <main className="flex-1 overflow-auto bg-muted/30 absolute inset-0 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
              <Users className="w-8 h-8 text-destructive" />
              Esquema
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConvocados(!showConvocados)}
              className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                showConvocados
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-card text-foreground border-border hover:border-primary/40 hover:text-primary'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Convocados
            </button>
            {activeGroups.length > 0 && (
              <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border">
                {activeGroups.map(g => (
                  <button key={g}
                    onClick={() => setVisibleGroups(prev => ({ ...prev, [g]: !prev[g] }))}
                    className={`text-[10px] font-mono font-bold px-2 py-1 rounded-md border transition-all ${
                      visibleGroups[g] !== false
                        ? `${getGroupColor(g)} shadow-sm`
                        : 'bg-card text-muted-foreground/40 border-border/50 opacity-50'
                    }`}
                  >
                    G{g}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowVacantsSidebar(true)}
              className="flex items-center gap-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive text-[11px] font-bold px-3 py-1.5 rounded-lg border border-destructive/20 hover:border-destructive/40 transition-all"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Ver Vacantes / Sin Asignar
            </button>
            <select
              className="bg-card border border-border rounded-xl px-4 py-2 text-sm font-bold text-foreground"
              value={execDate}
              onChange={(e) => setExecDate(e.target.value)}
            >
              {activeDates.map((d: string) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Convocados overlay */}
        {showConvocados && (
          <div className="mb-6 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Convocados ({convocadosWithFloors.length})
              </span>
              <button onClick={() => setShowConvocados(false)}
                className="p-1 rounded-md hover:bg-muted transition-colors">
                <XIcon className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto">
              {convocadosWithFloors.map((res: any) => (
                <button key={res.id}
                  onClick={() => {
                    if (res.isAbsent) return;
                    setSelectedVacant({ id: res.id, name: res.name, date: execDate });
                    setShowConvocados(false);
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-all text-left ${
                    res.isAbsent
                      ? 'border-dashed border-stone-300 bg-stone-50 cursor-not-allowed opacity-70'
                      : 'border-border bg-muted/20 hover:border-primary/40 hover:bg-accent/50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className={`font-bold text-xs truncate ${res.isAbsent ? 'line-through text-stone-400' : ''}`}>
                      {res.isAbsent ? '🚫 ' : ''}{res.name}
                    </span>
                    {isRotation && res.groups.length > 0 && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        {res.groups.map((g: number) => (
                          <span key={g}
                            className={`text-[9px] px-1 py-0.5 rounded font-mono border ${
                              visibleGroups[g] !== false
                                ? getGroupColor(g)
                                : 'bg-muted text-muted-foreground/40 border-border/40'
                            }`}>
                            G{g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {res.isAbsent && (
                    <span className="text-[9px] bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded border border-stone-300 font-bold whitespace-nowrap shrink-0">AUSENTE</span>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    {Object.entries(floorNames).map(([piso, info]) => {
                      const count = res.counts[piso] || 0;
                      const isZero = count === 0;
                      const isP4 = piso === '4';
                      return (
                        <div key={piso}
                          className={`w-[18px] h-[18px] rounded flex items-center justify-center text-[8px] font-bold transition-all ${
                            isZero && !isP4
                              ? 'bg-muted text-muted-foreground/40 border border-dashed border-muted-foreground/30 line-through'
                              : isZero && isP4
                                ? `${info.bgClass} text-white opacity-50`
                                : `${info.bgClass} text-white`
                          }`}
                          title={`${info.label}: ${count} dispositivos`}
                        >
                          {count}
                        </div>
                      );
                    })}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <AperturaDevicesPanel
          data={data}
          execDate={execDate}
          pushUndo={pushUndo}
          year={year}
          setSelectedDevice={setSelectedDevice}
          setSelectedDateFilter={setSelectedDateFilter}
          visibleGroups={visibleGroups}
          showCapacitadosColors={showCapacitadosColors}
          showPisoColors={showPisoColors}
        />
      </div>
    </main>
  );
};
