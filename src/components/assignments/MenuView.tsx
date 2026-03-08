import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { getFloorColor, getGroupColor } from '@/lib/floor-utils';
import type { AssignmentEntry } from '@/types/assignments';

interface MenuViewProps {
  data: any;
  year: string;
}

const TURNO_OPTIONS = [
  { key: 'apertura', label: 'Apertura' },
  { key: 'tarde', label: 'Turno Tarde' },
  { key: 'manana', label: 'Turno Mañana' },
] as const;

export const MenuView: React.FC<MenuViewProps> = ({ data, year }) => {
  const { dbDevices, assignmentsDb, activeDates, convocadosDb, convocadosCountDb, isAgentAbsent, agentGroups, tipoOrganizacionMap, calendarDb } = data;

  const [selectedDateIdx, setSelectedDateIdx] = useState(0);

  const currentDate = activeDates[selectedDateIdx] || activeDates[0] || '';
  const orgType = tipoOrganizacionMap[currentDate] || 'dispositivos fijos';

  const prevDate = () => setSelectedDateIdx(i => Math.max(0, i - 1));
  const nextDate = () => setSelectedDateIdx(i => Math.min(activeDates.length - 1, i + 1));

  // Build the menu for this date
  const dateAssignments = assignmentsDb[currentDate] || {};
  const convocados = convocadosDb[currentDate] || [];
  const convocadosCount = convocadosCountDb[currentDate] || 0;

  // Group devices by piso
  const pisoGroups: Record<number, typeof dbDevices> = {};
  dbDevices.forEach((dev: any) => {
    const p = dev.piso || 0;
    if (!pisoGroups[p]) pisoGroups[p] = [];
    pisoGroups[p].push(dev);
  });

  const pisoNames: Record<number, string> = { 1: 'Piso 1 — Papel', 2: 'Piso 2 — Madera', 3: 'Piso 3 — Textil' };
  const pisoColors: Record<number, string> = { 1: 'border-cyan-400 bg-cyan-50', 2: 'border-rose-400 bg-rose-50', 3: 'border-amber-400 bg-amber-50' };

  // Count assigned & vacant
  let totalAssigned = 0;
  let totalCupos = 0;
  dbDevices.forEach((dev: any) => {
    const assigned = (dateAssignments[dev.id] || []).length;
    totalAssigned += assigned;
    totalCupos += calendarDb[currentDate]?.[dev.id] || dev.max;
  });
  const totalVacant = totalCupos - totalAssigned;

  // Find unassigned convocados
  const assignedIds = new Set<number>();
  Object.values(dateAssignments).forEach((arr: any) => {
    arr.forEach((r: any) => assignedIds.add(r.id));
  });
  const freeConvocados = convocados.filter((id: number) => !assignedIds.has(id));

  return (
    <main className="flex-1 overflow-auto bg-muted/30 absolute inset-0">
      <div className="p-6 max-w-5xl mx-auto">
        {/* Date Navigator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20">
              <LayoutGrid className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Menú del Día</h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Vista completa de asignaciones por dispositivo</p>
            </div>
          </div>
        </div>

        {/* Date selector bar */}
        <div className="flex items-center gap-3 mb-6 bg-card rounded-xl border border-border p-3 shadow-sm">
          <button onClick={prevDate} disabled={selectedDateIdx === 0}
            className="p-2 rounded-lg hover:bg-accent disabled:opacity-30 transition-colors border border-border">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center">
            <span className="text-2xl font-black text-foreground tracking-tight">{currentDate}</span>
            <div className="flex items-center justify-center gap-3 mt-1">
              <span className="text-xs font-bold text-muted-foreground">
                👥 {convocadosCount} convocados
              </span>
              <span className="text-xs font-bold text-emerald-600">
                ✅ {totalAssigned} asignados
              </span>
              {totalVacant > 0 && (
                <span className="text-xs font-bold text-destructive">
                  ⚠️ {totalVacant} vacantes
                </span>
              )}
              {freeConvocados.length > 0 && (
                <span className="text-xs font-bold text-amber-600">
                  🆓 {freeConvocados.length} libres
                </span>
              )}
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

        {/* Menu cards by piso */}
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
                    {/* Device header */}
                    <div className={`px-3 py-2 flex items-center justify-between ${getFloorColor(dev.name)}`}>
                      <span className="font-bold text-sm truncate">{dev.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          isUnder ? 'bg-destructive/10 text-destructive border-destructive/30'
                          : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                        }`}>
                          {assignments.length}/{cupo}
                        </span>
                      </div>
                    </div>
                    {/* Residents list */}
                    <div className="p-2 space-y-1">
                      {assignments.length === 0 ? (
                        <div className="text-center text-muted-foreground/50 text-xs py-3 font-mono">Sin asignaciones</div>
                      ) : assignments.map((res, i) => {
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
      </div>
    </main>
  );
};