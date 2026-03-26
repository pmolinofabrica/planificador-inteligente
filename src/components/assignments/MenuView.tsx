import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Lock, Unlock } from 'lucide-react';
import { getFloorColor } from '@/lib/floor-utils';
import { supabase } from '@/integrations/supabase/client';
import type { AssignmentEntry } from '@/types/assignments';
import { VisitBlock } from './VisitBadge';

interface MenuViewProps {
  data: any;
  year: string;
  isLocked?: boolean;
  onLock?: (locked: boolean) => void;
}

const pisoNames: Record<number, string> = { 1: 'Piso 1 — Papel', 2: 'Piso 2 — Madera', 3: 'Piso 3 — Textil' };

// We read banners from the public/banners folder. Default is PNG but falls back to JPG.
const piso4Banners = [
  '/banners/banner1',
  '/banners/banner2',
  '/banners/banner3',
  '/banners/banner4'
];

export const MenuView: React.FC<MenuViewProps> = ({ data, year, isLocked = false, onLock }) => {
  const { dbDevices, assignmentsDb, activeDates, convocadosDb, convocadosCountDb, isAgentAbsent, isAgentCanceled, agentGroups, tipoOrganizacionMap, setTipoOrganizacionMap, calendarDb, allResidentsDb, turnoFilter, dateTurnoMap, setIsLoading, refresh, visitasByDate } = data;

  const [bannerIdx, setBannerIdx] = useState(0);

  const isNonApertura = turnoFilter === 'tarde' || turnoFilter === 'manana';

  const [selectedDateIdx, setSelectedDateIdx] = useState(0);

  const currentDate = activeDates[selectedDateIdx] || activeDates[0] || '';
  const orgType = tipoOrganizacionMap[currentDate] || 'dispositivos fijos';

  // When locked, only allow dates from today backwards
  const isDateFuture = useCallback((dateStr: string) => {
    if (!dateStr) return false;
    const [d, m] = dateStr.split('/').map(Number);
    const now = new Date();
    const todayMonth = now.getMonth() + 1;
    const todayDay = now.getDate();
    if (m > todayMonth) return true;
    if (m === todayMonth && d > todayDay) return true;
    return false;
  }, []);

  const canSelectDate = (dateStr: string) => {
    if (!isLocked) return true;
    return !isDateFuture(dateStr);
  };

  const prevDate = () => {
    let next = selectedDateIdx - 1;
    while (next >= 0 && isLocked && isDateFuture(activeDates[next])) next--;
    if (next >= 0) setSelectedDateIdx(next);
  };
  const nextDate = () => {
    let next = selectedDateIdx + 1;
    while (next < activeDates.length && isLocked && isDateFuture(activeDates[next])) next++;
    if (next < activeDates.length) setSelectedDateIdx(next);
  };

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
    const cupo = calendarDb[currentDate]?.[dev.id];
    if (cupo == null || cupo <= 0) return; // skip devices without active cupo
    const assigned = (dateAssignments[dev.id] || []).length;
    totalAssigned += assigned;
    totalCupos += cupo;
  });
  const totalVacant = totalCupos - totalAssigned;

  const absentAssigned: { name: string; device: string, reason: string }[] = [];
  Object.entries(dateAssignments).forEach(([devId, arr]: [string, any]) => {
    const devObj = dbDevices.find((dd: any) => dd.id === devId);
    arr.forEach((r: any) => {
      if (isAgentAbsent(r.id, currentDate)) {
        absentAssigned.push({ name: r.name, device: devObj?.name || devId, reason: 'Ausente' });
      } else if (isAgentCanceled && isAgentCanceled(r.id, currentDate)) {
        absentAssigned.push({ name: r.name, device: devObj?.name || devId, reason: 'Cancelada' });
      }
    });
  });

  const freeConvocados = convocados.filter((id: number) => !assignedIds.has(id));
  // absent/canceled are not actually free
  const absentFreeIds = freeConvocados.filter((id: number) => isAgentAbsent(id, currentDate) || (isAgentCanceled && isAgentCanceled(id, currentDate)));
  const actuallyFree = freeConvocados.filter((id: number) => !isAgentAbsent(id, currentDate) && !(isAgentCanceled && isAgentCanceled(id, currentDate)));
  const freeConvocadosNames = actuallyFree.map((id: number) => {
    const res = allResidentsDb?.find((r: any) => r.id === id);
    return res ? res.name : `#${id}`;
  });
  const absentFreeNames = absentFreeIds.map((id: number) => {
    const res = allResidentsDb?.find((r: any) => r.id === id);
    return res ? res.name : `#${id}`;
  });

  const restingCount = (allResidentsDb?.length || 0) - convocadosCount;

  // Org type change removed — now handled in DevicesTab

  // Piso accent dot color using design tokens
  const pisoAccent = (p: number) =>
    p === 1 ? 'bg-[hsl(var(--floor-1-accent))]'
    : p === 2 ? 'bg-[hsl(var(--floor-2-accent))]'
    : 'bg-[hsl(var(--floor-3-accent))]';

  const pisoBorder = (p: number) =>
    p === 1 ? 'border-[hsl(var(--floor-1-border))] bg-[hsl(var(--floor-1-bg))]'
    : p === 2 ? 'border-[hsl(var(--floor-2-border))] bg-[hsl(var(--floor-2-bg))]'
    : 'border-[hsl(var(--floor-3-border))] bg-[hsl(var(--floor-3-bg))]';

  const isRotacionCompleta = orgType === 'rotacion completa';

  // Get distinct groups for rotacion completa layout
  const distinctGroups = useMemo(() => {
    if (!isRotacionCompleta) return [];
    const groups = new Set<number>();
    Object.values(dateAssignments).forEach((arr: any) => {
      arr.forEach((r: any) => {
        if (r.numero_grupo != null) groups.add(r.numero_grupo);
      });
    });
    return Array.from(groups).sort();
  }, [dateAssignments, isRotacionCompleta]);

  return (
    <main className="flex-1 overflow-auto bg-muted/30 absolute inset-0">
      <div className={`mx-auto px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 ${isLocked ? 'max-w-4xl' : 'max-w-5xl'}`}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          {isLocked ? (
            <h2 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight leading-tight flex-1 text-center">
              El Molino Fábrica Cultural
            </h2>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight leading-tight">Menú del Día</h2>
              </div>
            </div>
          )}
        </div>

        {/* ── Date Selector ── */}
        <div className="flex items-center gap-2 sm:gap-3 mb-3 bg-card rounded-xl border border-border p-2.5 sm:p-3 shadow-warm">
          <button onClick={prevDate} disabled={selectedDateIdx === 0}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-accent disabled:opacity-30 transition-colors border border-border flex-shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center min-w-0">
            <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight">{currentDate}</span>
            {/* Stats row */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mt-1 flex-wrap">
              <span className="text-[10px] sm:text-xs font-bold text-muted-foreground">👥 Conv. {convocadosCount}</span>
              <span className="text-[10px] sm:text-xs font-bold text-[hsl(var(--score-high-text))]">✅ Asig. {totalAssigned}</span>
              {totalVacant > 0 && <span className="text-[10px] sm:text-xs font-bold text-destructive">⚠️ Vac. {totalVacant}</span>}
              {freeConvocados.length > 0 && <span className="text-[10px] sm:text-xs font-bold text-[hsl(var(--score-mid-text))]">🆓 Libres {actuallyFree.length}</span>}
              {(absentAssigned.length + absentFreeNames.length) > 0 && <span className="text-[10px] sm:text-xs font-bold text-stone-500">🚫 Ausent. {absentAssigned.length + absentFreeNames.length}</span>}
              {(visitasByDate?.[currentDate] || []).length > 0 && (
                <span className="text-[10px] sm:text-xs font-bold text-[hsl(var(--floor-2-text))]">🏫 Visitas {visitasByDate[currentDate].length}</span>
              )}
            </div>
            {orgType !== 'dispositivos fijos' && (
              <span className="inline-block mt-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md border bg-[hsl(var(--floor-3-bg))] text-[hsl(var(--floor-3-text))] border-[hsl(var(--floor-3-border))]">
                🔄 {orgType}
              </span>
            )}
          </div>
          <button onClick={nextDate} disabled={selectedDateIdx >= activeDates.length - 1 || (isLocked && !canSelectDate(activeDates[selectedDateIdx + 1]))}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-accent disabled:opacity-30 transition-colors border border-border flex-shrink-0">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── Quick Date Chips ── */}
        <div className="flex gap-1 sm:gap-1.5 mb-4 sm:mb-6 overflow-x-auto pb-1 custom-scrollbar -mx-1 px-1">
          {activeDates.map((d: string, idx: number) => {
            const future = isDateFuture(d);
            const disabled = isLocked && future;
            return (
              <button key={d} onClick={() => !disabled && setSelectedDateIdx(idx)}
                disabled={disabled}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border whitespace-nowrap transition-all flex-shrink-0 ${
                  disabled
                    ? 'bg-muted text-muted-foreground/40 border-border/50 cursor-not-allowed'
                    : idx === selectedDateIdx
                      ? 'bg-primary text-primary-foreground border-primary shadow-warm scale-105'
                      : 'bg-card text-muted-foreground border-border hover:bg-accent'
                }`}>
                {d}
              </button>
            );
          })}
        </div>

        {/* ══════ VISITAS GRUPALES ══════ */}
        {(visitasByDate?.[currentDate] || []).length > 0 && (
          <div className="mb-4 sm:mb-6">
            <VisitBlock visitas={visitasByDate[currentDate]} locked={isLocked} interactive={isNonApertura} onGroupChange={() => refresh()} />
          </div>
        )}

        {/* ── Rotacion Completa: Group Legend ── */}
        {isRotacionCompleta && distinctGroups.length > 1 && (
          <div className="mb-3 flex items-center gap-2 px-1">
            <span className="text-[10px] font-bold text-muted-foreground">Grupos:</span>
            {distinctGroups.map(g => (
              <span key={g} className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                <span className={`w-2.5 h-2.5 rounded-full ${getGroupDotColor(g)}`} />
                G{g}
              </span>
            ))}
          </div>
        )}

        {/* ══════ ACOMPAÑANTES DE GRUPO ══════ */}
        {(() => {
          const acompanantes: { id: number; name: string; deviceName: string }[] = [];
          Object.entries(dateAssignments).forEach(([devId, arr]: [string, any]) => {
            const devObj = dbDevices.find((dd: any) => dd.id === devId);
            arr.forEach((r: any) => {
              if (r.acompana_grupo && !isAgentAbsent(r.id, currentDate)) {
                acompanantes.push({ id: r.id, name: r.name, deviceName: devObj?.name || devId });
              }
            });
          });
          if (acompanantes.length === 0) return null;
          return (
            <div className="mb-4 sm:mb-6 rounded-xl border-2 border-[hsl(var(--floor-2-border))] bg-[hsl(var(--floor-2-bg))] overflow-hidden">
              <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-[hsl(var(--floor-2-border))]/50 flex items-center gap-2">
                <span className="text-sm sm:text-base">🏫</span>
                <span className="font-black text-xs sm:text-sm tracking-wide text-[hsl(var(--floor-2-text))]">
                  Acompañantes de Grupo ({acompanantes.length})
                </span>
              </div>
              <div className="p-2 sm:p-3 space-y-1">
                {acompanantes.map((a, i) => (
                  <div key={`acomp-${a.id}-${i}`} className="flex items-center justify-between px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-[hsl(var(--floor-2-border))]/30 bg-card text-[11px] sm:text-xs">
                    <span className="font-bold text-foreground truncate">🏫 {a.name}</span>
                    <span className="text-[9px] sm:text-[10px] font-medium text-[hsl(var(--floor-2-text))] flex-shrink-0 ml-2">
                      📍 {a.deviceName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ══════ ASSIGNED DEVICES BY PISO ══════ */}
        {Object.entries(pisoGroups).sort(([a], [b]) => Number(a) - Number(b)).map(([piso, devices]) => (
          <div key={piso} className={`mb-4 sm:mb-6 rounded-xl border-2 overflow-hidden ${pisoBorder(Number(piso))}`}>
            {/* Piso header */}
            {Number(piso) === 4 ? (
              <div className="relative w-full h-24 sm:h-32 border-b border-border/30 bg-muted/30 overflow-hidden flex items-center justify-between group">
                <img
                  src={piso4Banners[bannerIdx] + '.png'}
                  alt="Banner Piso 4"
                  className="absolute inset-0 w-full h-full object-cover object-center opacity-90 transition-opacity"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src.endsWith('.png')) {
                      // If PNG failed, try JPG
                      target.src = piso4Banners[bannerIdx] + '.jpg';
                    } else if (target.src.endsWith('.jpg')) {
                      // If JPG also failed, try WEBP
                      target.src = piso4Banners[bannerIdx] + '.webp';
                    } else {
                      // If all failed, show the fallback text
                      target.style.display = 'none';
                      target.parentElement!.classList.add('bg-stone-200', 'dark:bg-stone-800');
                      const msgDiv = document.createElement('div');
                      msgDiv.className = 'absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-bold text-stone-400 text-center px-4';
                      msgDiv.innerText = `Sube tus imágenes como public${piso4Banners[bannerIdx]}.jpg (o .png)`;
                      target.parentElement!.appendChild(msgDiv);
                    }
                  }}
                />

                <div className="relative z-10 w-full flex justify-end px-3 sm:px-4">
                  <button
                    onClick={() => setBannerIdx((prev) => (prev + 1) % piso4Banners.length)}
                    title="Cambiar diseño del banner"
                    className="p-1.5 sm:p-2 rounded-md bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors text-xs font-bold opacity-0 group-hover:opacity-100 shadow-sm"
                  >
                    ✨ Rotar Imagen
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-border/30 flex items-center gap-2">
                <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${pisoAccent(Number(piso))}`} />
                <span className="font-black text-xs sm:text-sm tracking-wide">{pisoNames[Number(piso)] || `Piso ${piso}`}</span>
              </div>
            )}

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
                      <span className="font-bold text-xs sm:text-sm truncate">{isLocked ? dev.name.replace(/\s*\(P\d\)\s*/g, '') : dev.name}</span>
                      <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${
                        isUnder ? 'bg-destructive/10 text-destructive border-destructive/30'
                        : 'score-high'
                      }`}>
                        {assignments.length}/{cupo}
                      </span>
                    </div>
                    {/* Resident list - horizontal columns for rotacion completa, stacked otherwise */}
                    {isRotacionCompleta && distinctGroups.length > 1 ? (
                      <div className="p-1.5 sm:p-2 flex gap-1">
                        {distinctGroups.map(gNum => {
                          const groupAssignments = assignments.filter(r => r.numero_grupo === gNum);
                          if (groupAssignments.length === 0) return (
                            <div key={gNum} className="flex-1 min-w-0" />
                          );
                          return (
                            <div key={gNum} className="flex-1 min-w-0 space-y-0.5">
                              {groupAssignments.map((res, i) => {
                                const absent = isAgentAbsent(res.id, currentDate);
                                const canceled = isAgentCanceled && isAgentCanceled(res.id, currentDate);
                                const isUnavailable = absent || canceled;
                                return (
                                  <div key={i} className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md border text-[10px] sm:text-xs ${
                                    isUnavailable ? 'bg-muted border-dashed border-muted-foreground/30 opacity-60' : 'bg-card border-border'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getGroupDotColor(gNum)}`} />
                              <span className={`font-bold truncate ${
                                      isUnavailable ? 'line-through text-muted-foreground'
                                      : agentGroups[String(res.id)] === 'A' ? 'text-[hsl(var(--group-a-text))] border-b-2 border-[hsl(var(--group-a-accent))]'
                                      : agentGroups[String(res.id)] === 'B' ? 'text-[hsl(var(--group-b-text))] border-b-2 border-[hsl(var(--group-b-accent))]'
                                      : ''
                                    }`}>
                                       {absent ? '🚫 ' : canceled ? '❌ ' : ''}{res.name}
                                     </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-1.5 sm:p-2 space-y-0.5 sm:space-y-1">
                        {assignments.map((res, i) => {
                          const absent = isAgentAbsent(res.id, currentDate);
                          const canceled = isAgentCanceled && isAgentCanceled(res.id, currentDate);
                          const isUnavailable = absent || canceled;
                          const group = res.numero_grupo;
                          return (
                            <div key={i} className={`flex items-center justify-between px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md border text-[11px] sm:text-xs ${
                              isUnavailable ? 'bg-muted border-dashed border-muted-foreground/30 opacity-60' : 'bg-card border-border'
                            }`}>
                              <span className={`font-bold truncate ${
                                isUnavailable ? 'line-through text-muted-foreground'
                                : agentGroups[String(res.id)] === 'A' ? 'text-[hsl(var(--group-a-text))] border-b-2 border-[hsl(var(--group-a-accent))]'
                                : agentGroups[String(res.id)] === 'B' ? 'text-[hsl(var(--group-b-text))] border-b-2 border-[hsl(var(--group-b-accent))]'
                                : ''
                              }`}>
                                {absent ? '🚫 ' : canceled ? '❌ ' : ''}{res.name}
                              </span>
                              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 ml-1">
                                {group != null && (
                                  <span className={`w-2 h-2 rounded-full ${getGroupDotColor(group)}`} />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* ══════ ABSENT ASSIGNED ══════ */}
        {(absentAssigned.length > 0 || absentFreeNames.length > 0) && (
          <div className="mb-4 sm:mb-6 rounded-xl border-2 border-[hsl(var(--score-mid-border))] bg-[hsl(var(--score-mid-bg))] overflow-hidden">
            <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-[hsl(var(--score-mid-border))]/50 flex items-center gap-2">
              <span className="text-sm sm:text-base">🚫</span>
              <span className="font-black text-xs sm:text-sm tracking-wide text-[hsl(var(--score-mid-text))]">Inasistencias ({absentAssigned.length + absentFreeNames.length})</span>
            </div>
            <div className="p-2 sm:p-3 space-y-1">
              {absentAssigned.map((item, i) => (
                <div key={`assigned-${i}`} className="flex items-center justify-between px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md border border-[hsl(var(--score-mid-border))]/30 bg-card text-[11px] sm:text-xs">
                  <span className="font-bold line-through text-muted-foreground truncate">{item.name}</span>
                  <span className="text-[9px] sm:text-[10px] font-medium text-[hsl(var(--score-mid-text))] flex-shrink-0 ml-2">{item.device}</span>
                </div>
              ))}
              {absentFreeNames.map((name, i) => (
                <div key={`free-${i}`} className="flex items-center justify-between px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md border border-dashed border-[hsl(var(--score-mid-border))]/30 bg-card text-[11px] sm:text-xs">
                  <span className="font-bold line-through text-muted-foreground truncate">{name}</span>
                  <span className="text-[9px] sm:text-[10px] font-medium text-stone-400 flex-shrink-0 ml-2">Sin asignar</span>
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

/** Returns a colored dot class for group number, matching floor accent colors */
function getGroupDotColor(num: number | null): string {
  if (num === 1) return 'bg-[hsl(var(--floor-1-accent))]';
  if (num === 2) return 'bg-[hsl(var(--floor-2-accent))]';
  if (num === 3) return 'bg-[hsl(var(--floor-3-accent))]';
  return 'bg-primary';
}
