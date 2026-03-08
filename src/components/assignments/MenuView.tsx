import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Lock, Unlock } from 'lucide-react';
import { getFloorColor, getGroupColor } from '@/lib/floor-utils';
import type { AssignmentEntry } from '@/types/assignments';

interface MenuViewProps {
  data: any;
  year: string;
  onLock?: (locked: boolean) => void;
  isLocked?: boolean;
}

const UNLOCK_CODE = '2350';

const pisoNames: Record<number, string> = { 1: 'Piso 1 — Papel', 2: 'Piso 2 — Madera', 3: 'Piso 3 — Textil' };
const pisoColors: Record<number, string> = { 1: 'border-cyan-400 bg-cyan-50', 2: 'border-rose-400 bg-rose-50', 3: 'border-amber-400 bg-amber-50' };

export const MenuView: React.FC<MenuViewProps> = ({ data, year, onLock, isLocked = false }) => {
  const { dbDevices, assignmentsDb, activeDates, convocadosDb, convocadosCountDb, isAgentAbsent, agentGroups, tipoOrganizacionMap, calendarDb, allResidentsDb } = data;

  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [showUnlockInput, setShowUnlockInput] = useState(false);
  const [unlockCode, setUnlockCode] = useState('');

  const currentDate = activeDates[selectedDateIdx] || activeDates[0] || '';
  const orgType = tipoOrganizacionMap[currentDate] || 'dispositivos fijos';

  const prevDate = () => setSelectedDateIdx(i => Math.max(0, i - 1));
  const nextDate = () => setSelectedDateIdx(i => Math.min(activeDates.length - 1, i + 1));

  const dateAssignments = assignmentsDb[currentDate] || {};
  const convocados = convocadosDb[currentDate] || [];
  const convocadosCount = convocadosCountDb[currentDate] || 0;

  // Build assigned IDs set
  const assignedIds = new Set<number>();
  Object.values(dateAssignments).forEach((arr: any) => {
    arr.forEach((r: any) => assignedIds.add(r.id));
  });

  // Group devices by piso - only those with assignments
  const pisoGroups: Record<number, typeof dbDevices> = {};
  dbDevices.forEach((dev: any) => {
    const assignments: AssignmentEntry[] = dateAssignments[dev.id] || [];
    if (assignments.length === 0) return; // Only show devices with residents
    const p = dev.piso || 0;
    if (!pisoGroups[p]) pisoGroups[p] = [];
    pisoGroups[p].push(dev);
  });

  // Count stats
  let totalAssigned = 0;
  let totalCupos = 0;
  dbDevices.forEach((dev: any) => {
    const assigned = (dateAssignments[dev.id] || []).length;
    totalAssigned += assigned;
    totalCupos += calendarDb[currentDate]?.[dev.id] || dev.max;
  });
  const totalVacant = totalCupos - totalAssigned;

  // Vacant devices (no assignments)
  const vacantDevices = dbDevices.filter((dev: any) => {
    const assignments: AssignmentEntry[] = dateAssignments[dev.id] || [];
    return assignments.length === 0;
  });

  // Absent convocados (assigned but absent)
  const absentAssigned: { name: string; device: string }[] = [];
  Object.entries(dateAssignments).forEach(([devId, arr]: [string, any]) => {
    const devObj = dbDevices.find((dd: any) => dd.id === devId);
    arr.forEach((r: any) => {
      if (isAgentAbsent(r.id, currentDate)) {
        absentAssigned.push({ name: r.name, device: devObj?.name || devId });
      }
    });
  });

  // Free convocados (not assigned)
  const freeConvocados = convocados.filter((id: number) => !assignedIds.has(id));
  const freeConvocadosNames = freeConvocados.map((id: number) => {
    const res = allResidentsDb?.find((r: any) => r.id === id);
    return res ? res.name : `#${id}`;
  });

  // Resting / other shift (not convocado, not assigned)
  // We don't list all of them, just the count
  const restingCount = (allResidentsDb?.length || 0) - convocadosCount;

  const handleLockToggle = () => {
    if (!isLocked) {
      onLock?.(true);
    } else {
      setShowUnlockInput(true);
      setUnlockCode('');
    }
  };

  const handleUnlockSubmit = () => {
    if (unlockCode === UNLOCK_CODE) {
      onLock?.(false);
      setShowUnlockInput(false);
      setUnlockCode('');
    } else {
      setUnlockCode('');
    }
  };

  return (
    <main className="flex-1 overflow-auto bg-muted/30 absolute inset-0">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {/* Header with lock button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20">
              <LayoutGrid className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Menú del Día</h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Vista completa de asignaciones</p>
            </div>
          </div>
          {/* Lock/Unlock button */}
          <button
            onClick={handleLockToggle}
            className={`p-2.5 rounded-xl border-2 transition-all ${
              isLocked
                ? 'bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20'
                : 'bg-muted border-border text-muted-foreground hover:bg-accent'
            }`}
            title={isLocked ? 'Desbloquear' : 'Bloquear vista'}
          >
            {isLocked ? <Lock className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
          </button>
        </div>

        {/* Unlock code input */}
        {showUnlockInput && (
          <div className="mb-4 flex items-center gap-2 bg-card border border-border rounded-xl p-3 shadow-sm">
            <LayoutGrid className="w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              maxLength={4}
              value={unlockCode}
              onChange={e => setUnlockCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlockSubmit()}
              placeholder="Código"
              className="bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono w-24 outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
            <button onClick={handleUnlockSubmit} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-bold">
              OK
            </button>
            <button onClick={() => setShowUnlockInput(false)} className="px-3 py-1.5 bg-muted text-muted-foreground rounded-md text-xs font-bold border border-border">
              ✕
            </button>
          </div>
        )}

        {/* Date selector bar */}
        <div className="flex items-center gap-3 mb-4 bg-card rounded-xl border border-border p-3 shadow-sm">
          <button onClick={prevDate} disabled={selectedDateIdx === 0}
            className="p-2 rounded-lg hover:bg-accent disabled:opacity-30 transition-colors border border-border">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center">
            <span className="text-2xl font-black text-foreground tracking-tight">{currentDate}</span>
            <div className="flex items-center justify-center gap-3 mt-1 flex-wrap">
              <span className="text-xs font-bold text-muted-foreground">👥 {convocadosCount} convocados</span>
              <span className="text-xs font-bold text-emerald-600">✅ {totalAssigned} asignados</span>
              {totalVacant > 0 && <span className="text-xs font-bold text-destructive">⚠️ {totalVacant} vacantes</span>}
              {freeConvocados.length > 0 && <span className="text-xs font-bold text-amber-600">🆓 {freeConvocados.length} libres</span>}
            </div>
            {orgType !== 'dispositivos fijos' && (
              <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md border bg-violet-100 text-violet-800 border-violet-300">
                🔄 {orgType}
              </span>
            )}
          </div>
          <button onClick={nextDate} disabled={selectedDateIdx >= activeDates.length - 1}
            className="p-2 rounded-lg hover:bg-accent disabled:opacity-30 transition-colors border border-border">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick date chips */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 custom-scrollbar">
          {activeDates.map((d: string, idx: number) => (
            <button key={d} onClick={() => setSelectedDateIdx(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap transition-all ${
                idx === selectedDateIdx
                  ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent'
              }`}>
              {d}
            </button>
          ))}
        </div>

        {/* ===== ASSIGNED DEVICES BY PISO ===== */}
        {Object.entries(pisoGroups).sort(([a], [b]) => Number(a) - Number(b)).map(([piso, devices]) => (
          <div key={piso} className={`mb-6 rounded-xl border-2 overflow-hidden ${pisoColors[Number(piso)] || 'border-border bg-muted/30'}`}>
            <div className="px-4 py-2.5 border-b border-border/50 flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${Number(piso) === 1 ? 'bg-cyan-500' : Number(piso) === 2 ? 'bg-rose-500' : 'bg-amber-500'}`} />
              <span className="font-black text-sm tracking-wide">{pisoNames[Number(piso)] || `Piso ${piso}`}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
              {(devices as any[]).map((dev: any) => {
                const assignments: AssignmentEntry[] = dateAssignments[dev.id] || [];
                const cupo = calendarDb[currentDate]?.[dev.id] || dev.max;
                const isUnder = assignments.length < dev.min;
                const isFull = assignments.length >= cupo;

                return (
                  <div key={dev.id} className={`bg-card rounded-lg border-2 overflow-hidden transition-all ${
                    isUnder ? 'border-destructive/40' : isFull ? 'border-emerald-400' : 'border-border'
                  }`}>
                    <div className={`px-3 py-2 flex items-center justify-between ${getFloorColor(dev.name)}`}>
                      <span className="font-bold text-sm truncate">{dev.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        isUnder ? 'bg-destructive/10 text-destructive border-destructive/30'
                        : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      }`}>
                        {assignments.length}/{cupo}
                      </span>
                    </div>
                    <div className="p-2 space-y-1">
                      {assignments.map((res, i) => {
                        const absent = isAgentAbsent(res.id, currentDate);
                        const group = agentGroups[String(res.id)];
                        return (
                          <div key={i} className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs ${
                            absent ? 'bg-muted border-dashed border-muted-foreground/30 opacity-60' : 'bg-card border-border'
                          }`}>
                            <span className={`font-bold ${absent ? 'line-through text-muted-foreground' : ''}`}>
                              {absent && '🚫 '}{res.name}
                            </span>
                            <div className="flex items-center gap-1">
                              {group && (
                                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-muted border border-border">
                                  {group}
                                </span>
                              )}
                              {res.numero_grupo != null && (
                                <span className={`text-[9px] px-1 py-0.5 rounded font-mono border ${getGroupColor(res.numero_grupo)}`}>
                                  G{res.numero_grupo}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* ===== VACANT DEVICES ===== */}
        {vacantDevices.length > 0 && (
          <div className="mb-6 rounded-xl border-2 border-destructive/30 bg-destructive/5 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-destructive/20 flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span className="font-black text-sm tracking-wide text-destructive">Dispositivos Vacantes ({vacantDevices.length})</span>
            </div>
            <div className="p-3 flex flex-wrap gap-2">
              {vacantDevices.map((dev: any) => (
                <div key={dev.id} className="px-3 py-1.5 rounded-lg border border-destructive/20 bg-card text-xs font-bold text-destructive">
                  {dev.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== ABSENT ASSIGNED ===== */}
        {absentAssigned.length > 0 && (
          <div className="mb-6 rounded-xl border-2 border-amber-400/40 bg-amber-50 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-amber-300/50 flex items-center gap-2">
              <span className="text-base">🚫</span>
              <span className="font-black text-sm tracking-wide text-amber-700">Inasistencias ({absentAssigned.length})</span>
            </div>
            <div className="p-3 space-y-1">
              {absentAssigned.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-md border border-amber-300/30 bg-card text-xs">
                  <span className="font-bold line-through text-muted-foreground">{item.name}</span>
                  <span className="text-[10px] font-medium text-amber-600">{item.device}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== FREE CONVOCADOS (not assigned) ===== */}
        {freeConvocadosNames.length > 0 && (
          <div className="mb-6 rounded-xl border-2 border-blue-400/40 bg-blue-50 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-blue-300/50 flex items-center gap-2">
              <span className="text-base">🆓</span>
              <span className="font-black text-sm tracking-wide text-blue-700">Convocados Libres ({freeConvocadosNames.length})</span>
            </div>
            <div className="p-3 flex flex-wrap gap-2">
              {freeConvocadosNames.map((name: string, i: number) => (
                <span key={i} className="px-3 py-1.5 rounded-lg border border-blue-300/30 bg-card text-xs font-bold text-blue-700">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ===== REST / OTHER SHIFT ===== */}
        {restingCount > 0 && (
          <div className="mb-6 rounded-xl border-2 border-border bg-muted/30 overflow-hidden">
            <div className="px-4 py-2.5 flex items-center gap-2">
              <span className="text-base">🌙</span>
              <span className="font-black text-sm tracking-wide text-muted-foreground">Descanso / Otro turno ({restingCount})</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
