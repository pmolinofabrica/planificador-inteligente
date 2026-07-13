import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Users, AlertCircle, X as XIcon, Monitor, Search } from 'lucide-react';
import { getPisoFromDeviceName, getGroupColor, getFloorColor } from '@/lib/floor-utils';
import type { SelectedResident, SelectedVacant } from '@/types/assignments';
import { AperturaDevicesPanel } from './AperturaDevicesPanel';
import { supabase } from '@/integrations/supabase/client';

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
  const { activeDates, allResidentsDb, convocadosDb, assignmentsDb, dbDevices, isAgentAbsent, visitasByDate, tipoOrganizacionMap, turnoFilter, agentConvocatoriaMap, addAssignmentDraft, annualMetricsDb, aperturaMetricsDb, tardeMananaMetricsDb } = data;
  const dbResidents = (data as any).dbResidents || [];

  const fechaDB = (() => {
    const [d, mStr] = execDate.split("/");
    return `${year}-${mStr?.padStart(2, '0')}-${d?.padStart(2, '0')}`;
  })();

  const [showConvocados, setShowConvocados] = useState(false);
  const [visibleGroups, setVisibleGroups] = useState<Record<number, boolean>>({});
  const [modalidad, setModalidad] = useState<'default' | 'fixture'>('default');
  const [showFixtureSidebar, setShowFixtureSidebar] = useState(false);
  const [fixtureData, setFixtureData] = useState<Record<string, { prioridad: number; residente1: number | null; residente2: number | null; asignado?: 'R1' | 'R2' | null }>>({});
  const [fixturePickerOpen, setFixturePickerOpen] = useState<string | null>(null); // "devId-R1" or "devId-R2"
  const [fixturePickerSearch, setFixturePickerSearch] = useState<Record<string, string>>({});
  const [isSavingFixture, setIsSavingFixture] = useState(false);
  const [selectedAutoCards, setSelectedAutoCards] = useState<Set<string>>(new Set());
  const savedFixtureData = useRef<Record<string, string>>({}); // devId -> JSON snapshot of last saved slot
  const fixtureLoadedRef = useRef<string>(''); // key to prevent re-initialization
  const [criteriosConfig, setCriteriosConfig] = useState<{ id: string; label: string; abrev: string; active: boolean; showInCards: boolean; order: number }[]>(
    [
      { id: 'coord_disp_total', label: 'Coord. Disp. (Total)', abrev: 'D.Tot.', active: true, showInCards: true, order: 1 },
      { id: 'coord_disp_apertura', label: 'Coord. Disp. (Apertura)', abrev: 'D.Ap.', active: false, showInCards: true, order: 2 },
      { id: 'coord_disp_tm', label: 'Coord. Disp. (T/M)', abrev: 'D.T/M', active: false, showInCards: true, order: 3 },
      { id: 'coord_piso_total', label: 'Coord. Piso (Total)', abrev: 'P.Tot.', active: false, showInCards: true, order: 4 },
      { id: 'coord_piso_apertura', label: 'Coord. Piso (Apertura)', abrev: 'P.Ap.', active: false, showInCards: true, order: 5 },
      { id: 'coord_piso_tm', label: 'Coord. Piso (T/M)', abrev: 'P.T/M', active: false, showInCards: true, order: 6 },
      { id: 'diversidad', label: 'Diversidad (%)', abrev: 'DIV', active: false, showInCards: true, order: 7 },
      { id: 'cumpleanos', label: 'Cumpleaños', abrev: 'CMP', active: false, showInCards: true, order: 8 },
    ]
  );
  const [showCriteriosSidebar, setShowCriteriosSidebar] = useState(false);

  // Initialize fixtureData when entering fixture mode or changing date
  useEffect(() => {
    if (modalidad !== 'fixture' || !dbDevices?.length) return;
    const loadKey = `${fechaDB}-${turnoFilter}-${dbDevices.length}`;
    if (fixtureLoadedRef.current === loadKey) return;
    fixtureLoadedRef.current = loadKey;

    // Load from DB directly (no reset to empty first)
    (async () => {
      const { data: plans } = await supabase
        .from('fixture_plan')
        .select('*')
        .eq('fecha', fechaDB)
        .eq('tipo_turno', turnoFilter);
      // Build a complete fresh state from DB (or empty defaults)
      const next: Record<string, { prioridad: number; residente1: number | null; residente2: number | null; asignado?: 'R1' | 'R2' | null }> = {};
      dbDevices.forEach((dev: any, idx: number) => {
        const plan = plans?.find((p: any) => String(p.id_dispositivo) === dev.id);
        next[dev.id] = plan
          ? {
              prioridad: plan.prioridad,
              residente1: plan.residente1,
              residente2: plan.residente2,
              asignado: plan.asignado || null,
            }
          : { prioridad: idx + 1, residente1: null, residente2: null, asignado: null };
        // Save snapshot for EVERY device so dirty detection works
        savedFixtureData.current[dev.id] = JSON.stringify({ residente1: next[dev.id].residente1, residente2: next[dev.id].residente2, asignado: next[dev.id].asignado ?? null, prioridad: next[dev.id].prioridad });
      });
      setFixtureData(next);
    })();
  }, [modalidad, dbDevices, execDate, fechaDB, turnoFilter]);

  // Criteria enabled globally (from sidebar)
  const activeCriterios = useMemo(() =>
    criteriosConfig.filter(c => c.active).sort((a, b) => a.order - b.order),
    [criteriosConfig]
  );

  // Criteria visible in resident cards (active + showInCards)
  const visibleCriterios = useMemo(() =>
    activeCriterios.filter(c => c.showInCards),
    [activeCriterios]
  );

  // Residents assigned (winner) in any fixture slot
  const assignedResidentIds = useMemo(() => {
    const ids = new Set<number>();
    Object.values(fixtureData).forEach(slot => {
      if (slot.asignado === 'R1' && slot.residente1 != null) ids.add(slot.residente1);
      else if (slot.asignado === 'R2' && slot.residente2 != null) ids.add(slot.residente2);
    });
    return ids;
  }, [fixtureData]);

  // Cards with pending changes (dirty) — used for save button display
  const fixtureDirtyCount = useMemo(() => {
    return Object.entries(fixtureData).filter(([devId, slot]) => {
      const snapshot = JSON.stringify({ residente1: slot.residente1, residente2: slot.residente2, asignado: slot.asignado, prioridad: slot.prioridad });
      return savedFixtureData.current[devId] !== snapshot;
    }).length;
  }, [fixtureData]);

  // Compute criteria values per resident
  const deviceFloorMap = useMemo(() => {
    const map = new Map<string, number>();
    (dbDevices || []).forEach((d: any) => {
      map.set(d.id, d.piso || parseInt((d.name?.match(/P(\d)/)?.[1] || '0')));
    });
    return map;
  }, [dbDevices]);

  const getCriterioValues = useCallback((agentId: number, devId: string): Record<string, number | string | null> => {
    const vals: Record<string, number | string | null> = {};
    vals.coord_disp_total = annualMetricsDb?.[agentId]?.deviceReps[devId] ?? 0;
    vals.coord_disp_apertura = aperturaMetricsDb?.[agentId]?.deviceReps[devId] ?? 0;
    vals.coord_disp_tm = tardeMananaMetricsDb?.[agentId]?.deviceReps[devId] ?? 0;

    const devicePiso = deviceFloorMap.get(devId) || 0;
    const sumByFloor = (metrics: any): number => {
      if (!metrics?.deviceReps) return 0;
      let total = 0;
      Object.entries(metrics.deviceReps).forEach(([dId, count]: [string, any]) => {
        if ((deviceFloorMap.get(dId) || 0) === devicePiso) total += count as number;
      });
      return total;
    };
    vals.coord_piso_total = sumByFloor(annualMetricsDb?.[agentId]);
    vals.coord_piso_apertura = sumByFloor(aperturaMetricsDb?.[agentId]);
    vals.coord_piso_tm = sumByFloor(tardeMananaMetricsDb?.[agentId]);

    const totalDev = dbDevices?.length || 1;
    const annAgent = annualMetricsDb?.[agentId];
    vals.diversidad = annAgent ? Math.round((annAgent.uniqueDevices.size / totalDev) * 100) : 0;

    const resData = dbResidents?.find((d: any) => d.id_agente === agentId);
    if (resData?.fecha_nacimiento) {
      const birth = new Date(resData.fecha_nacimiento);
      const today = new Date();
      const nextBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
      if (nextBirthday < today) nextBirthday.setFullYear(today.getFullYear() + 1);
      vals.cumpleanos = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    } else {
      vals.cumpleanos = null;
    }
    return vals;
  }, [annualMetricsDb, aperturaMetricsDb, tardeMananaMetricsDb, deviceFloorMap, dbDevices, dbResidents]);

  // Detect fixture plans modified externally (menu changed after fixture save)
  const modifiedExternally = useMemo(() => {
    const result = new Set<string>(); // devIds
    const menuForDate = assignmentsDb?.[execDate] || {};
    Object.entries(fixtureData).forEach(([devId, slot]) => {
      if (!slot.asignado) return;
      const expectedId = slot.asignado === 'R1' ? slot.residente1 : slot.residente2;
      if (expectedId == null) return;
      const menuEntries = menuForDate[devId] || [];
      const found = menuEntries.some((e: any) => Number(e.id) === Number(expectedId));
      if (!found) result.add(devId);
    });
    return result;
  }, [fixtureData, assignmentsDb, execDate]);

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
            {selectedAutoCards.size > 0 && (
              <button
                onClick={() => {
                  const allPlaced = new Set<number>();
                  Object.values(fixtureData).forEach(s => {
                    if (s.residente1 != null) allPlaced.add(s.residente1);
                    if (s.residente2 != null) allPlaced.add(s.residente2);
                  });
                  const pool = (allResidentsDb || [])
                    .filter((r: any) => convocadoIds.has(r.id) && !allPlaced.has(r.id) && !isAgentAbsent?.(r.id, execDate));
                  const shuffled = [...pool].sort(() => Math.random() - 0.5);
                  const used = new Set<number>();
                  setFixtureData(prev => {
                    const next = { ...prev };
                    selectedAutoCards.forEach(devId => {
                      const slot = next[devId];
                      if (!slot) return;
                      const candidates = shuffled.filter(r => !used.has(r.id));
                      let ci = 0;
                      const updates: any = {};
                      if (slot.residente1 == null) {
                        while (ci < candidates.length && updates.residente1 == null) {
                          const r = candidates[ci++];
                          if (r.id !== slot.residente2) {
                            updates.residente1 = r.id;
                            used.add(r.id);
                          }
                        }
                      }
                      if (slot.residente2 == null) {
                        while (ci < candidates.length && updates.residente2 == null) {
                          const r = candidates[ci++];
                          if (r.id !== (updates.residente1 ?? slot.residente1)) {
                            updates.residente2 = r.id;
                            used.add(r.id);
                          }
                        }
                      }
                      if (updates.residente1 != null || updates.residente2 != null) {
                        next[devId] = { ...slot, ...updates };
                      }
                    });
                    return next;
                  });
                  setSelectedAutoCards(new Set());
                }}
                className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg border border-blue-600 transition-all shadow-sm"
              >
                <Users className="w-3.5 h-3.5" />
                Autocompletar ({selectedAutoCards.size})
              </button>
            )}
            <select
              className="bg-card border border-border rounded-xl px-4 py-2 text-sm font-bold text-foreground"
              value={execDate}
              onChange={(e) => setExecDate(e.target.value)}
            >
              {activeDates.map((d: string) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Modality selector */}
        <div className="flex items-center gap-2 mb-4 bg-card p-1 rounded-lg border border-border w-fit">
          <button
            onClick={() => setModalidad('default')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
              modalidad === 'default'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Por defecto
          </button>
          <button
            onClick={() => setModalidad('fixture')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
              modalidad === 'fixture'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Fixture
          </button>
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

        {modalidad === 'fixture' ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => {
                  if (Object.keys(fixtureData).length === 0) {
                    const initial: Record<string, { prioridad: number; residente1: number | null; residente2: number | null; asignado?: 'R1' | 'R2' | null }> = {};
                    dbDevices.forEach((dev: any, idx: number) => {
                      initial[dev.id] = { prioridad: idx + 1, residente1: null, residente2: null, asignado: null };
                    });
                    setFixtureData(initial);
                  }
                  setShowFixtureSidebar(true);
                }}
                className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all bg-card text-foreground border-border hover:border-primary/40 hover:text-primary"
              >
                <Monitor className="w-3.5 h-3.5" />
                Dispositivos
              </button>
              <button
                onClick={() => setShowCriteriosSidebar(true)}
                className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all bg-card text-foreground border-border hover:border-primary/40 hover:text-primary"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zm4 6a1 1 0 011-1h8a1 1 0 010 2H8a1 1 0 01-1-1zm2 5a1 1 0 011-1h4a1 1 0 010 2h-4a1 1 0 01-1-1z" />
                </svg>
                Criterios
              </button>
              <button
                onClick={async () => {
                  setIsSavingFixture(true);
                  try {
                    Object.entries(fixtureData).forEach(([devId, slot]) => {
                      const oldSnapshotStr = savedFixtureData.current[devId];
                      const snapshot = JSON.stringify({ residente1: slot.residente1, residente2: slot.residente2, asignado: slot.asignado, prioridad: slot.prioridad });
                      if (oldSnapshotStr === snapshot) return;

                      // 1. Upsert fixture_plan when changed (even if cleared — clears the row)
                      addAssignmentDraft({
                        id: `fixture-plan-${devId}-${fechaDB}`,
                        table: 'fixture_plan',
                        action: 'upsert',
                        matchParams: { id_dispositivo: parseInt(devId), fecha: fechaDB, tipo_turno: turnoFilter },
                        payload: {
                          id_dispositivo: parseInt(devId),
                          fecha: fechaDB,
                          tipo_turno: turnoFilter,
                          prioridad: slot.prioridad,
                          residente1: slot.residente1,
                          residente2: slot.residente2,
                          asignado: slot.asignado || null,
                        },
                        uiDate: execDate,
                      });
                      savedFixtureData.current[devId] = snapshot;

                      // 2. Handle winner menu assignment changes
                      const oldWinner = oldSnapshotStr ? (() => { const s = JSON.parse(oldSnapshotStr); return s.asignado === 'R1' ? s.residente1 : s.asignado === 'R2' ? s.residente2 : null; })() : null;
                      const newWinner = slot.asignado === 'R1' ? slot.residente1 : slot.asignado === 'R2' ? slot.residente2 : null;
                      if (oldWinner != null && oldWinner !== newWinner) {
                        addAssignmentDraft({
                          id: `fixture-del-${oldWinner}-${fechaDB}-${devId}`,
                          table: 'menu',
                          action: 'delete',
                          matchParams: { id_agente: oldWinner, fecha_asignacion: fechaDB, id_dispositivo: parseInt(devId) },
                          uiDate: execDate,
                        });
                      }
                      if (newWinner != null) {
                        const res = (allResidentsDb || []).find((r: any) => r.id === newWinner);
                        const convId = agentConvocatoriaMap?.[execDate]?.[newWinner];
                        if (convId && res) {
                          addAssignmentDraft({
                            id: `fixture-${newWinner}-${fechaDB}-${devId}`,
                            table: 'menu',
                            action: 'upsert',
                            matchParams: { id_agente: newWinner, fecha_asignacion: fechaDB, id_dispositivo: parseInt(devId) },
                            payload: {
                              id_agente: newWinner, id_dispositivo: parseInt(devId),
                              fecha_asignacion: fechaDB, estado_ejecucion: 'planificado',
                              id_convocatoria: convId, prioridad: slot.prioridad,
                              _ui_name: res.name,
                            },
                            uiDate: execDate,
                          });
                        }
                      }
                    });
                    setIsSavingFixture(false);
                  } catch (err: any) {
                    console.error('Error saving fixture:', err);
                    setIsSavingFixture(false);
                  }
                }}
                disabled={isSavingFixture || Object.keys(fixtureData).length === 0}
                className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSavingFixture ? '⏳' : '💾'} Guardar fixture {fixtureDirtyCount > 0 ? `(${fixtureDirtyCount} cambios)` : `(${Object.values(fixtureData).reduce((acc, s) => acc + (s.asignado === 'R1' && s.residente1 != null || s.asignado === 'R2' && s.residente2 != null ? 1 : 0), 0)} asignados)`}
              </button>
            </div>

            <div className="flex gap-4">
              {/* Left panel: resident list */}
              <div className="w-56 shrink-0 bg-card rounded-lg border border-border overflow-hidden self-start sticky top-0 max-h-[calc(100vh-12rem)] flex flex-col">
                <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Residentes</span>
                  <span className="text-[9px] font-mono text-muted-foreground">{assignedResidentIds.size}/{convocadoIds.size}</span>
                </div>
                <div className="flex-1 overflow-y-auto text-[11px]">
                  {(allResidentsDb || [])
                    .slice()
                    .sort((a: any, b: any) => {
                      const aConv = convocadoIds.has(a.id);
                      const bConv = convocadoIds.has(b.id);
                      if (aConv && !bConv) return -1;
                      if (!aConv && bConv) return 1;
                      return a.name.localeCompare(b.name);
                    })
                    .map((r: any, idx: number, arr: any[]) => {
                      const isConvocado = convocadoIds.has(r.id);
                      const isAssigned = assignedResidentIds.has(r.id);
                      const isAusente = isAgentAbsent ? isAgentAbsent(r.id, execDate) : false;
                      const showHeader = idx === 0 || convocadoIds.has(arr[idx-1].id) !== isConvocado;
                      return (
                        <React.Fragment key={r.id}>
                          {showHeader && (
                            <div className="px-3 py-1 text-[8px] font-bold text-muted-foreground/60 uppercase tracking-wider bg-muted/10 border-b border-border/20">
                              {isConvocado ? 'Convocados' : 'Descanso / Otro turno'}
                            </div>
                          )}
                          <div className={`px-3 py-1.5 border-b border-border/10 flex items-center gap-1.5 transition-all ${
                            isAssigned ? 'bg-emerald-50' : isConvocado ? '' : 'opacity-40'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isAssigned ? 'bg-emerald-500' : isAusente ? 'bg-red-400' : isConvocado ? 'bg-blue-400' : 'bg-stone-300'
                            }`} />
                            <span className={`font-medium truncate ${
                              isAssigned ? 'text-emerald-700 font-bold' : ''
                            } ${isAusente ? 'line-through text-stone-400' : ''}`}>
                              {isAusente ? '🚫 ' : ''}{r.name}
                            </span>
                          </div>
                        </React.Fragment>
                      );
                    })}
                </div>
              </div>

              {/* Fixture grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1">
              {Object.entries(fixtureData)
                .sort(([, a], [, b]) => a.prioridad - b.prioridad)
                .map(([devId, slot]) => {
                  const dev = dbDevices.find((d: any) => d.id === devId);
                  if (!dev) return null;
                  const piso = getPisoFromDeviceName(dev.name);
                  const convocados = (allResidentsDb || [])
                    .filter((r: any) => convocadoIds.has(r.id) && !isAgentAbsent?.(r.id, execDate))
                    .sort((a: any, b: any) => a.name.localeCompare(b.name));

                  const renderRow = (label: 'R1' | 'R2') => {
                    const rKey = label === 'R1' ? 'residente1' : 'residente2';
                    const residentId = slot[rKey];
                    const selected = residentId ? convocados.find((r: any) => r.id === residentId) : null;
                    const isAsignado = slot.asignado === label;
                    const isPickerOpen = fixturePickerOpen === `${devId}-${label}`;
                    const search = fixturePickerOpen === `${devId}-${label}` ? (fixturePickerSearch[fixturePickerOpen!] || '') : '';

                    return (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (!residentId) return;
                            setFixtureData(prev => ({
                              ...prev,
                              [devId]: { ...prev[devId], asignado: prev[devId].asignado === label ? null : label }
                            }));
                          }}
                          className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                            residentId
                              ? isAsignado
                                ? 'border-emerald-500 bg-emerald-500'
                                : 'border-muted-foreground hover:border-emerald-400'
                              : 'border-muted-foreground/30 cursor-not-allowed'
                          }`}
                        >
                          {isAsignado && <div className="w-2 h-2 rounded-full bg-white" />}
                        </button>
                        <span className={`text-[10px] font-bold font-mono shrink-0 ${residentId ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                        <div className="flex-1 relative">
                          {isPickerOpen ? (
                            <div>
                              <div className="relative">
                                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                  type="text"
                                  placeholder="Buscar..."
                                  value={search}
                                  onChange={(e) => setFixturePickerSearch(prev => ({ ...prev, [fixturePickerOpen!]: e.target.value }))}
                                  autoFocus
                                  className="w-full text-[11px] pl-7 pr-2 py-1.5 rounded-md border border-border bg-muted/30 font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                              </div>
                              <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                                {(() => {
                                  const s = search;
                                  const filtered = s
                                    ? convocados.filter((r: any) => r.name.toLowerCase().includes(s.toLowerCase()))
                                    : convocados;
                                  // Filter out the resident already selected in the other slot
                                  const otherKey = label === 'R1' ? 'residente2' : 'residente1';
                                  const available = filtered.filter((r: any) => r.id !== slot[otherKey]);
                                  if (available.length === 0) return <div className="px-2 py-1.5 text-[10px] text-muted-foreground">Sin resultados</div>;
                                  return available.map((r: any) => (
                                    <button
                                      key={r.id}
                                      onClick={() => {
                                        setFixtureData(prev => ({ ...prev, [devId]: { ...prev[devId], [rKey]: r.id } }));
                                        setFixturePickerOpen(null);
                                        setFixturePickerSearch(prev => ({ ...prev, [`${devId}-${label}`]: '' }));
                                      }}
                                      className={`w-full text-left px-2 py-1.5 text-[11px] font-medium hover:bg-accent transition-colors ${
                                        residentId === r.id ? 'bg-primary/10 text-primary' : ''
                                      }`}
                                    >
                                      <div>{r.name}</div>
                                      {visibleCriterios.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {visibleCriterios.map(c => {
                                            const val = getCriterioValues(r.id, devId)[c.id];
                                            return val != null ? (
                                              <span key={c.id} className="text-[9px] font-bold font-mono leading-tight px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border/60">
                                                {c.abrev}:{val}
                                              </span>
                                            ) : null;
                                          })}
                                        </div>
                                      )}
                                    </button>
                                  ));
                                })()}
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setFixturePickerOpen(`${devId}-${label}`);
                                setFixturePickerSearch(prev => ({ ...prev, [`${devId}-${label}`]: '' }));
                              }}
                              className={`w-full text-left px-2 py-1.5 text-[11px] font-bold rounded-md border transition-all ${
                                residentId
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                  : 'bg-muted/20 border-dashed border-border text-muted-foreground hover:bg-muted/40'
                              }`}
                            >
                              {residentId ? (
                                <>
                                  <div>{selected?.name}</div>
                                  {visibleCriterios.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {(() => {
                                        const otherKey = label === 'R1' ? 'residente2' : 'residente1';
                                        const otherId = slot[otherKey];
                                        const currentVals = getCriterioValues(residentId, devId);
                                        const otherVals = otherId ? getCriterioValues(otherId, devId) : null;
                                        return visibleCriterios.map(c => {
                                          const val = currentVals?.[c.id];
                                          const otherVal = otherVals?.[c.id];
                                          let compareClass = '';
                                          if (val != null && otherVal != null) {
                                            const v = typeof val === 'number' ? val : 0;
                                            const ov = typeof otherVal === 'number' ? otherVal : 0;
                                            if (v > ov) compareClass = 'bg-blue-100 border-blue-300 text-blue-700';
                                            else if (v < ov) compareClass = '';
                                            else compareClass = 'bg-yellow-100 border-yellow-300 text-yellow-700';
                                          }
                                          return val != null ? (
                                            <span key={c.id} className={`text-[10px] font-bold font-mono leading-tight px-1.5 py-0.5 rounded border ${
                                              compareClass || 'bg-emerald-100/60 text-emerald-700 border-emerald-200/60'
                                            }`}>
                                              {c.abrev}:{val}
                                            </span>
                                          ) : null;
                                        });
                                      })()}
                                    </div>
                                  )}
                                </>
                              ) : 'Seleccionar'}
                            </button>
                          )}
                        </div>
                        {residentId && !isPickerOpen && (
                          <button
                            onClick={() => setFixtureData(prev => ({ ...prev, [devId]: { ...prev[devId], [rKey]: null, asignado: prev[devId].asignado === label ? null : prev[devId].asignado } }))}
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <XIcon className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  };

                  return (
                    <div key={devId} className={`p-3 rounded-lg border bg-card shadow-sm border-l-[3px] ${
                      selectedAutoCards.has(devId) ? 'ring-2 ring-blue-400 border-blue-300' : 'border-border'
                    }`} style={{
                      borderLeftColor: piso === '1' ? 'hsl(var(--floor-1-border))' : piso === '2' ? 'hsl(var(--floor-2-border))' : piso === '3' ? 'hsl(var(--floor-3-border))' : undefined
                    }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedAutoCards.has(devId)}
                            onChange={(e) => {
                              setSelectedAutoCards(prev => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(devId);
                                else next.delete(devId);
                                return next;
                              });
                            }}
                            className="w-3.5 h-3.5 rounded border-border accent-blue-500 cursor-pointer"
                          />
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            piso === '1' ? 'bg-[hsl(var(--floor-1-bg))] text-[hsl(var(--floor-1-text))] border-[hsl(var(--floor-1-border))]'
                            : piso === '2' ? 'bg-[hsl(var(--floor-2-bg))] text-[hsl(var(--floor-2-text))] border-[hsl(var(--floor-2-border))]'
                            : piso === '3' ? 'bg-[hsl(var(--floor-3-bg))] text-[hsl(var(--floor-3-text))] border-[hsl(var(--floor-3-border))]'
                            : 'bg-muted text-muted-foreground border-border'
                          }`}>
                            P{piso}
                          </span>
                          <span className="text-xs font-bold truncate">{dev.name}</span>
                          {modifiedExternally.has(devId) && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-300 whitespace-nowrap" title="Modificado externamente">
                              ⚠ Modificado
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground">#{slot.prioridad}</span>
                      </div>
                      <div className="space-y-2">
                        {renderRow('R1')}
                        {renderRow('R2')}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Active criteria panel on the right */}
            {activeCriterios.length > 0 && (
              <div className="w-44 shrink-0 bg-card rounded-lg border border-border overflow-hidden self-start sticky top-0 max-h-[calc(100vh-12rem)] flex flex-col">
                <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Criterios</span>
                  <span className="text-[9px] font-mono text-muted-foreground">{activeCriterios.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto text-[11px]">
                  {activeCriterios.map(c => (
                    <div key={c.id} className="px-3 py-1.5 border-b border-border/10 flex items-center gap-2">
                      <span className="text-[10px] font-bold font-mono text-foreground w-4 shrink-0">{c.order}.</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-foreground text-[11px]">{c.abrev}</div>
                        <div className="text-[8px] text-muted-foreground truncate">{c.label}</div>
                      </div>
                      <button
                        onClick={() => setCriteriosConfig(prev => prev.map(cf => cf.id === c.id ? { ...cf, showInCards: !cf.showInCards } : cf))}
                        className={`relative w-7 h-3.5 rounded-full transition-all border shrink-0 ${
                          c.showInCards ? 'bg-blue-400 border-blue-500' : 'bg-muted border-border'
                        }`}
                      >
                        <div className={`absolute top-[1.5px] w-2.5 h-2.5 rounded-full bg-white shadow transition-all ${
                          c.showInCards ? 'left-[15px]' : 'left-0.5'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>

            {/* Sidebar for priority ordering only */}
            {showFixtureSidebar && (
              <div className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                  <h3 className="text-sm font-bold">Orden de dispositivos</h3>
                  <button onClick={() => setShowFixtureSidebar(false)}
                    className="p-1 rounded-md hover:bg-muted transition-colors">
                    <XIcon className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {Object.entries(fixtureData)
                    .sort(([, a], [, b]) => a.prioridad - b.prioridad)
                    .map(([devId, slot]) => {
                      const dev = dbDevices.find((d: any) => d.id === devId);
                      if (!dev) return null;
                      const spiso = getPisoFromDeviceName(dev.name);
                      return (
                        <div key={devId} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/20 border-l-[3px]" style={{
                          borderLeftColor: spiso === '1' ? 'hsl(var(--floor-1-border))' : spiso === '2' ? 'hsl(var(--floor-2-border))' : spiso === '3' ? 'hsl(var(--floor-3-border))' : undefined
                        }}>
                          <span className="text-[10px] font-mono font-bold text-muted-foreground w-6 text-center">{slot.prioridad}</span>
                          <span className={`text-[8px] font-bold px-1 rounded border ${
                            spiso === '1' ? 'bg-[hsl(var(--floor-1-bg))] text-[hsl(var(--floor-1-text))] border-[hsl(var(--floor-1-border))]'
                            : spiso === '2' ? 'bg-[hsl(var(--floor-2-bg))] text-[hsl(var(--floor-2-text))] border-[hsl(var(--floor-2-border))]'
                            : spiso === '3' ? 'bg-[hsl(var(--floor-3-bg))] text-[hsl(var(--floor-3-text))] border-[hsl(var(--floor-3-border))]'
                            : 'bg-muted text-muted-foreground border-border'
                          }`}>P{spiso}</span>
                          <span className="text-[11px] font-medium truncate flex-1">{dev.name}</span>
                          <input
                            type="number"
                            min={1}
                            max={dbDevices.length}
                            value={slot.prioridad}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setFixtureData(prev => ({
                                ...prev,
                                [devId]: { ...prev[devId], prioridad: Math.max(1, Math.min(dbDevices.length, val)) }
                              }));
                            }}
                            className="w-12 text-[11px] text-center font-bold py-1 rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            {showCriteriosSidebar && (
              <div className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                  <h3 className="text-sm font-bold">Criterios de asignación</h3>
                  <button onClick={() => setShowCriteriosSidebar(false)}
                    className="p-1 rounded-md hover:bg-muted transition-colors">
                    <XIcon className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  <p className="text-[10px] text-muted-foreground mb-2">Los criterios activos se muestran debajo del nombre de cada residente en las tarjetas de dispositivos.</p>
                  {criteriosConfig
                    .sort((a, b) => a.order - b.order)
                    .map((c, idx) => (
                      <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-muted/20">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground w-5 text-center">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold font-mono text-foreground">{c.abrev}</span>
                            <span className="text-[10px] text-muted-foreground truncate">{c.label}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            min={1}
                            max={criteriosConfig.length}
                            value={c.order}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setCriteriosConfig(prev => prev.map(cf => cf.id === c.id ? { ...cf, order: Math.max(1, Math.min(criteriosConfig.length, val)) } : cf));
                            }}
                            className="w-10 text-[10px] text-center font-bold py-0.5 rounded border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <button
                            onClick={() => setCriteriosConfig(prev => prev.map(cf => cf.id === c.id ? { ...cf, active: !cf.active } : cf))}
                            className={`relative w-8 h-4 rounded-full transition-all border ${
                              c.active ? 'bg-emerald-400 border-emerald-500' : 'bg-muted border-border'
                            }`}
                          >
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${
                              c.active ? 'left-[18px]' : 'left-0.5'
                            }`} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        ) : (
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
        )}
      </div>
    </main>
  );
};
