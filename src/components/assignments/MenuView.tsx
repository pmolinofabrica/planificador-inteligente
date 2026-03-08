import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Lock } from 'lucide-react';
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

  const assignedIds = new Set<number>();
  Object.values(dateAssignments).forEach((arr: any) => {
    arr.forEach((r: any) => assignedIds.add(r.id));
  });

  // Group devices by piso - only those with assignments
  const pisoGroups: Record<number, typeof dbDevices> = {};
  dbDevices.forEach((dev: any) => {
    const assignments: AssignmentEntry[] = dateAssignments[dev.id] || [];
    if (assignments.length === 0) return;
    const p = dev.piso || 0;
    if (!pisoGroups[p]) pisoGroups[p] = [];
    pisoGroups[p].push(dev);
  });

  let totalAssigned = 0;
  let totalCupos = 0;
  dbDevices.forEach((dev: any) => {
    const assigned = (dateAssignments[dev.id] || []).length;
    totalAssigned += assigned;
    totalCupos += calendarDb[currentDate]?.[dev.id] || dev.max;
  });
  const totalVacant = totalCupos - totalAssigned;

  const absentAssigned: { name: string; device: string }[] = [];
  Object.entries(dateAssignments).forEach(([devId, arr]: [string, any]) => {
    const devObj = dbDevices.find((dd: any) => dd.id === devId);
    arr.forEach((r: any) => {
      if (isAgentAbsent(r.id, currentDate)) {
        absentAssigned.push({ name: r.name, device: devObj?.name || devId });
      }
    });
  });

  const freeConvocados = convocados.filter((id: number) => !assignedIds.has(id));
  const freeConvocadosNames = freeConvocados.map((id: number) => {
    const res = allResidentsDb?.find((r: any) => r.id === id);
    return res ? res.name : `#${id}`;
  });

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

  // Piso accent dot color using design tokens
  const pisoAccent = (p: number) =>
    p === 1 ? 'bg-[hsl(var(--floor-1-accent))]'
    : p === 2 ? 'bg-[hsl(var(--floor-2-accent))]'
    : 'bg-[hsl(var(--floor-3-accent))]';

  const pisoBorder = (p: number) =>
    p === 1 ? 'border-[hsl(var(--floor-1-border))] bg-[hsl(var(--floor-1-bg))]'
    : p === 2 ? 'border-[hsl(var(--floor-2-border))] bg-[hsl(var(--floor-2-bg))]'
    : 'border-[hsl(var(--floor-3-border))] bg-[hsl(var(--floor-3-bg))]';

  return (
    <main className="flex-1 overflow-auto bg-muted/30 absolute inset-0">
      <div className={`mx-auto px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 ${isLocked ? 'max-w-4xl' : 'max-w-5xl'}`}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-primary/10 p-2 sm:p-2.5 rounded-xl border border-primary/20">
              <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight leading-tight">Menú del Día</h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium hidden sm:block">Vista completa de asignaciones</p>
            </div>
          </div>
          <button
            onClick={handleLockToggle}
            className={`p-2 sm:p-2.5 rounded-xl border-2 transition-all ${
              isLocked
                ? 'bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20'
                : 'bg-muted border-border text-muted-foreground hover:bg-accent'
            }`}
            title={isLocked ? 'Desbloquear' : 'Bloquear vista'}
          >
            {isLocked ? <Lock className="w-4 h-4 sm:w-5 sm:h-5" /> : <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>

        {/* Unlock code input */}
        {showUnlockInput && (
          <div className="mb-3 flex items-center gap-2 bg-card border border-border rounded-xl p-2.5 sm:p-3 shadow-warm">
            <LayoutGrid className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="password"
              maxLength={4}
              value={unlockCode}
              onChange={e => setUnlockCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlockSubmit()}
              placeholder="Código"
              className="bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono w-20 outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
            <button onClick={handleUnlockSubmit} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-bold">OK</button>
            <button onClick={() => setShowUnlockInput(false)} className="px-2.5 py-1.5 bg-muted text-muted-foreground rounded-md text-xs font-bold border border-border">✕</button>
          </div>
        )}

        {/* ── Date Selector ── */}
        <div className="flex items-center gap-2 sm:gap-3 mb-3 bg-card rounded-xl border border-border p-2.5 sm:p-3 shadow-warm">
          <button onClick={prevDate} disabled={selectedDateIdx === 0}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-accent disabled:opacity-30 transition-colors border border-border flex-shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center min-w-0">
            <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight">{currentDate}</span>
            {/* Stats row — stacked on mobile, inline on tablet+ */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mt-1 flex-wrap">
              <span className="text-[10px] sm:text-xs font-bold text-muted-foreground">👥 {convocadosCount}</span>
              <span className="text-[10px] sm:text-xs font-bold text-[hsl(var(--score-high-text))]">✅ {totalAssigned}</span>
              {totalVacant > 0 && <span className="text-[10px] sm:text-xs font-bold text-destructive">⚠️ {totalVacant}</span>}
              {freeConvocados.length > 0 && <span className="text-[10px] sm:text-xs font-bold text-[hsl(var(--score-mid-text))]">🆓 {freeConvocados.length}</span>}
            </div>
            {orgType !== 'dispositivos fijos' && (
              <span className="inline-block mt-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md border bg-[hsl(var(--floor-3-bg))] text-[hsl(var(--floor-3-text))] border-[hsl(var(--floor-3-border))]">
                🔄 {orgType}
              </span>
            )}
          </div>
          <button onClick={nextDate} disabled={selectedDateIdx >= activeDates.length - 1}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-accent disabled:opacity-30 transition-colors border border-border flex-shrink-0">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── Quick Date Chips ── scrollable on mobile */}
        <div className="flex gap-1 sm:gap-1.5 mb-4 sm:mb-6 overflow-x-auto pb-1 custom-scrollbar -mx-1 px-1">
          {activeDates.map((d: string, idx: number) => (
            <button key={d} onClick={() => setSelectedDateIdx(idx)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border whitespace-nowrap transition-all flex-shrink-0 ${
                idx === selectedDateIdx
                  ? 'bg-primary text-primary-foreground border-primary shadow-warm scale-105'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent'
              }`}>
              {d}
            </button>
          ))}
        </div>

        {/* ══════ ASSIGNED DEVICES BY PISO ══════ */}
        {Object.entries(pisoGroups).sort(([a], [b]) => Number(a) - Number(b)).map(([piso, devices]) => (
          <div key={piso} className={`mb-4 sm:mb-6 rounded-xl border-2 overflow-hidden ${pisoBorder(Number(piso))}`}>
            {/* Piso header */}
            <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-border/30 flex items-center gap-2">
              <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${pisoAccent(Number(piso))}`} />
              <span className="font-black text-xs sm:text-sm tracking-wide">{pisoNames[Number(piso)] || `Piso ${piso}`}</span>
            </div>

            {/* Device cards grid:
                - Phone: 1 col
                - Tablet (locked menu): 2 cols  
                - Tablet landscape / Desktop: 2 cols */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 p-2 sm:p-3">
              {(devices as any[]).map((dev: any) => {
                const assignments: AssignmentEntry[] = dateAssignments[dev.id] || [];
                const cupo = calendarDb[currentDate]?.[dev.id] || dev.max;
                const isUnder = assignments.length < dev.min;
                const isFull = assignments.length >= cupo;

                return (
                  <div key={dev.id} className={`bg-card rounded-lg border-2 overflow-hidden transition-all ${
                    isUnder ? 'border-destructive/40' : isFull ? 'border-[hsl(var(--score-high-border))]' : 'border-border'
                  }`}>
                    {/* Device header */}
                    <div className={`px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between gap-2 ${getFloorColor(dev.name)}`}>
                      <span className="font-bold text-xs sm:text-sm truncate">{dev.name}</span>
                      <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${
                        isUnder ? 'bg-destructive/10 text-destructive border-destructive/30'
                        : 'score-high'
                      }`}>
                        {assignments.length}/{cupo}
                      </span>
                    </div>
                    {/* Resident list */}
                    <div className="p-1.5 sm:p-2 space-y-0.5 sm:space-y-1">
                      {assignments.map((res, i) => {
                        const absent = isAgentAbsent(res.id, currentDate);
                        const group = agentGroups[String(res.id)];
                        return (
                          <div key={i} className={`flex items-center justify-between px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md border text-[11px] sm:text-xs ${
                            absent ? 'bg-muted border-dashed border-muted-foreground/30 opacity-60' : 'bg-card border-border'
                          }`}>
                            <span className={`font-bold truncate ${absent ? 'line-through text-muted-foreground' : ''}`}>
                              {absent && '🚫 '}{res.name}
                            </span>
                            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 ml-1">
                              {group && (
                                <span className="text-[8px] sm:text-[9px] font-bold px-1 py-0.5 rounded bg-muted border border-border">
                                  {group}
                                </span>
                              )}
                              {res.numero_grupo != null && (
                                <span className={`text-[8px] sm:text-[9px] px-1 py-0.5 rounded font-mono border ${getGroupColor(res.numero_grupo)}`}>
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

        {/* ══════ ABSENT ASSIGNED ══════ */}
        {absentAssigned.length > 0 && (
          <div className="mb-4 sm:mb-6 rounded-xl border-2 border-[hsl(var(--score-mid-border))] bg-[hsl(var(--score-mid-bg))] overflow-hidden">
            <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-[hsl(var(--score-mid-border))]/50 flex items-center gap-2">
              <span className="text-sm sm:text-base">🚫</span>
              <span className="font-black text-xs sm:text-sm tracking-wide text-[hsl(var(--score-mid-text))]">Inasistencias ({absentAssigned.length})</span>
            </div>
            <div className="p-2 sm:p-3 space-y-1">
              {absentAssigned.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md border border-[hsl(var(--score-mid-border))]/30 bg-card text-[11px] sm:text-xs">
                  <span className="font-bold line-through text-muted-foreground truncate">{item.name}</span>
                  <span className="text-[9px] sm:text-[10px] font-medium text-[hsl(var(--score-mid-text))] flex-shrink-0 ml-2">{item.device}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════ FREE CONVOCADOS ══════ */}
        {freeConvocadosNames.length > 0 && (
          <div className="mb-4 sm:mb-6 rounded-xl border-2 border-[hsl(var(--floor-1-border))] bg-[hsl(var(--floor-1-bg))] overflow-hidden">
            <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-[hsl(var(--floor-1-border))]/50 flex items-center gap-2">
              <span className="text-sm sm:text-base">🆓</span>
              <span className="font-black text-xs sm:text-sm tracking-wide text-[hsl(var(--floor-1-text))]">Convocados Libres ({freeConvocadosNames.length})</span>
            </div>
            <div className="p-2 sm:p-3 flex flex-wrap gap-1.5 sm:gap-2">
              {freeConvocadosNames.map((name: string, i: number) => (
                <span key={i} className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-[hsl(var(--floor-1-border))]/30 bg-card text-[10px] sm:text-xs font-bold text-[hsl(var(--floor-1-text))]">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ══════ REST / OTHER SHIFT ══════ */}
        {restingCount > 0 && (
          <div className="mb-4 sm:mb-6 rounded-xl border-2 border-border bg-muted/30 overflow-hidden">
            <div className="px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2">
              <span className="text-sm sm:text-base">🌙</span>
              <span className="font-black text-xs sm:text-sm tracking-wide text-muted-foreground">Descanso / Otro turno ({restingCount})</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
