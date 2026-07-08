import React, { useState, useMemo } from 'react';
import { Monitor, Plus, Check, AlertCircle, Moon, Lock, Clock, MessageSquare } from 'lucide-react';
import { getFloorColor, getGroupColor, getPisoFromDeviceName, getFloorPisoStyle, computeLeastFloors, getFloorTextClass } from '@/lib/floor-utils';
import { normalizeStr } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VisitBlock } from './VisitBadge';
import { ObservacionesPopup } from './ObservacionesPopup';
import type { AssignmentDataContext, UndoEntry } from '@/types/assignments';

interface AperturaDevicesPanelProps {
  data: AssignmentDataContext;
  execDate: string;
  pushUndo: (entry: Omit<UndoEntry, '_timestamp'>) => void;
  year: string;
  setSelectedDevice: (d: { id: string; name: string; date: string } | null) => void;
  setSelectedDateFilter: (d: string | null) => void;
  visibleGroups?: Record<number, boolean>;
  showCapacitadosColors?: boolean;
  showPisoColors?: boolean;
}

export const AperturaDevicesPanel: React.FC<AperturaDevicesPanelProps> = ({
  data, execDate, pushUndo, year, setSelectedDevice, setSelectedDateFilter, visibleGroups,
  showCapacitadosColors = true, showPisoColors = false,
}) => {
  const {
    dbDevices, assignmentsDb, calendarDb, setCalendarDb,
    convocadosDb, allResidentsDb, isAgentAbsent,
    agentConvocatoriaMap, isLoading, setIsLoading, refresh,
    visitasByDate, turnoFilter, dateTurnoMap,
    aperturaMetricsDb, tardeMananaMetricsDb,
    tipoOrganizacionMap, addAssignmentDraft,
    agentTipoTurnoMap, llamadosByAsignacion, agentGroups,
  } = data;

  const isAperturaMode = turnoFilter === 'apertura';
  const isAperturaB = (agentId: number) => normalizeStr(agentTipoTurnoMap[execDate]?.[agentId] || '') === 'apertura al publico b';

  const [selectedClosedDevice, setSelectedClosedDevice] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [observacionesVisit, setObservacionesVisit] = useState<{ open: boolean; idAsignacion: number | null; nombre: string }>({ open: false, idAsignacion: null, nombre: '' });

  const [d, mStr] = execDate.split('/');
  const fechaDB = `${year}-${mStr?.padStart(2, '0')}-${d?.padStart(2, '0')}`;

  // Build device status for this date
  const openDevices: { device: any; assignments: any[] }[] = [];
  const closedDevices: { device: any }[] = [];

  dbDevices.forEach((device: any) => {
    const cupo = calendarDb[execDate]?.[device.id] || 0;
    const assignments = assignmentsDb[execDate]?.[device.id] || [];
    if (cupo > 0 && assignments.length > 0) {
      openDevices.push({ device, assignments });
    } else {
      closedDevices.push({ device });
    }
  });

  // Build occupancy map for the date
  const occupancies: Record<number, { deviceId: string; deviceName: string }> = {};
  Object.entries(assignmentsDb[execDate] || {}).forEach(([devId, arr]: [string, any]) => {
    const devObj = dbDevices.find((dd: any) => dd.id === devId);
    arr.forEach((r: any) => {
      occupancies[r.id] = { deviceId: devId, deviceName: devObj?.name || 'Otro' };
    });
  });

  const convocadoIds = new Set(convocadosDb[execDate] || []);
  const visitas = visitasByDate?.[execDate] || [];

  const isRotation = tipoOrganizacionMap?.[execDate] === 'rotacion simple' || tipoOrganizacionMap?.[execDate] === 'rotacion completa';
  const isNonApertura = turnoFilter === 'tarde' || turnoFilter === 'manana';

  // Active groups for this date (rotation only)
  const activeGroups = useMemo(() => {
    const orgType = tipoOrganizacionMap?.[execDate] || 'dispositivos fijos';
    const isRot = orgType === 'rotacion simple' || orgType === 'rotacion completa';
    if (!isRot) return [];
    const groups = new Set<number>();
    (visitasByDate?.[execDate] || []).forEach((v: any) => {
      (v.numero_grupo || []).forEach((g: number) => {
        if (g >= 1 && g <= 3) groups.add(g);
      });
    });
    return Array.from(groups).sort((a, b) => a - b);
  }, [tipoOrganizacionMap, execDate, visitasByDate]);

  // Pre-compute floor device counts per resident across ALL devices
  const residentFloorCounts = useMemo(() => {
    const map: Record<number, Record<string, number>> = {};
    Object.entries(assignmentsDb[execDate] || {}).forEach(([devId, residents]: [string, any]) => {
      const dev = dbDevices.find((d: any) => d.id === devId);
      if (!dev) return;
      const piso = getPisoFromDeviceName(dev.name);
      residents.forEach((r: any) => {
        if (!map[r.id]) map[r.id] = { '1': 0, '2': 0, '3': 0, '4': 0 };
        map[r.id][piso] = (map[r.id][piso] || 0) + 1;
      });
    });
    return map;
  }, [assignmentsDb, execDate, dbDevices]);

  const leastFloors = useMemo(() => {
    if (!showPisoColors) return {};
    return computeLeastFloors(assignmentsDb[execDate] || {}, dbDevices);
  }, [showPisoColors, assignmentsDb, execDate, dbDevices]);

  const getResidentColor = (resId: number): string => {
    if (showPisoColors && leastFloors[resId] != null) {
      return getFloorTextClass(leastFloors[resId]);
    }
    if (showCapacitadosColors && agentGroups[String(resId)] === 'A') {
      return 'text-[hsl(var(--group-a-text))] border-b-2 border-[hsl(var(--group-a-accent))]';
    }
    if (showCapacitadosColors && agentGroups[String(resId)] === 'B') {
      return 'text-[hsl(var(--group-b-text))] border-b-2 border-[hsl(var(--group-b-accent))]';
    }
    return '';
  };

  // Toggle acompaña_grupo for a resident in apertura (menu table)
  const handleToggleAcompana = async (resId: number, deviceId: string, current: boolean) => {
    if (isLoading) return;

    // Si se está desmarcando, verificar que el residente no esté en múltiples dispositivos (solo en dispositivos fijos)
    if (current && !isAperturaMode && !isRotation) {
      const deviceCount = Object.keys(assignmentsDb[execDate] || {}).filter(dId =>
        (assignmentsDb[execDate][dId] || []).some((a: any) => a.id === resId)
      ).length;
      if (deviceCount > 1) {
        alert(`El residente está asignado a ${deviceCount} dispositivos. Para quitar "acompaña grupo", primero deje al residente vacante o asígnelo a un solo dispositivo.`);
        return;
      }
    }

    const updateObj: any = {};
    updateObj['acompaña_grupo'] = !current;
    if (isAperturaMode) {
      addAssignmentDraft({
        id: `acompanar-${resId}-${fechaDB}-${deviceId}`,
        table: 'menu',
        action: 'update',
        matchParams: { id_agente: resId, fecha_asignacion: fechaDB, id_dispositivo: parseInt(deviceId) },
        payload: updateObj,
        uiDate: execDate,
      });
    } else {
      const turnoId = dateTurnoMap[execDate];
      if (!turnoId) {
        toast.error(`No se pudo resolver id_turno para ${execDate}`);
        return;
      }
      addAssignmentDraft({
        id: `acompanar-${resId}-${fechaDB}-${turnoId}-${deviceId}`,
        table: 'menu_semana',
        action: 'update',
        matchParams: { id_agente: resId, fecha_asignacion: fechaDB, id_turno: turnoId, id_dispositivo: parseInt(deviceId) },
        payload: updateObj,
        uiDate: execDate,
      });
    }
    toast.success(!current ? 'Marcado como acompañante' : 'Desmarcado como acompañante');
  };

  // Toggle group assignment for rotation modes (mirrors PlanningMatrix.handleGroupChange)
  const handleGroupChange = async (resId: number, deviceId: string, newGroup: number | null) => {
    setEditingGroup(null);
    const turnoId = dateTurnoMap[execDate];
    if (!turnoId) {
      alert(`No se pudo resolver id_turno para ${execDate}.`);
      return;
    }
    const orgType = tipoOrganizacionMap?.[execDate] || 'rotacion completa';
    const currentRows = assignmentsDb[execDate]?.[deviceId] || [];
    const currentResident = currentRows.find((r: any) => r.id === resId);
    const existingGroups = currentResident
      ? (Array.isArray(currentResident.numero_grupos)
        ? currentResident.numero_grupos
        : (currentResident.numero_grupo != null ? [currentResident.numero_grupo] : []))
      : [];
    const isToggleOff = newGroup != null && existingGroups.includes(newGroup);
    const groupToDelete = newGroup ?? (existingGroups.length === 1 ? existingGroups[0] : null);

    if (newGroup == null && existingGroups.length > 1) {
      alert('La tarjeta tiene varios grupos. Usá el grupo específico para quitar una sola fila física.');
      return;
    }
    if ((isToggleOff || newGroup == null) && groupToDelete == null) return;

    const action = isToggleOff || newGroup == null ? 'delete' : 'upsert';
    const physicalGroup = action === 'delete' ? groupToDelete : newGroup;

    addAssignmentDraft({
      id: `group-${resId}-${fechaDB}-${turnoId}-${deviceId}-${physicalGroup ?? 'null'}-${action}`,
      table: 'menu_semana',
      action,
      matchParams: {
        id_agente: resId,
        fecha_asignacion: fechaDB,
        id_turno: turnoId,
        id_dispositivo: parseInt(deviceId),
        ...(physicalGroup != null ? { numero_grupo: physicalGroup } : {}),
      },
      payload: action === 'delete'
        ? { tipo_organizacion: orgType, _ui_name: currentResident?.name }
        : {
            id_agente: resId,
            fecha_asignacion: fechaDB,
            id_turno: turnoId,
            id_dispositivo: parseInt(deviceId),
            numero_grupo: physicalGroup,
            tipo_organizacion: orgType,
            _ui_name: currentResident?.name,
          },
      uiDate: execDate,
    });

  };

  // Remove resident from device
  const handleQuitar = (resId: number, deviceId: string) => {
    if (isLoading) return;
    const resName = allResidentsDb.find((r: any) => r.id === resId)?.name || "Residente";
    const turnoId = dateTurnoMap[execDate];

    if (isAperturaMode) {
      if (!confirm(`¿Quitar a ${resName} de este dispositivo (irá al baúl)?`)) return;
      addAssignmentDraft({
        id: `remove-${resId}-${fechaDB}-${turnoFilter}-${deviceId}`,
        table: 'menu',
        action: 'update',
        matchParams: { id_agente: resId, id_dispositivo: parseInt(deviceId), fecha_asignacion: fechaDB },
        payload: { id_dispositivo: 999, _ui_name: resName },
        uiDate: execDate
      });
    } else {
      if (!turnoId) {
        alert(`No se pudo resolver id_turno para ${execDate}.`);
        return;
      }
      const orgType = tipoOrganizacionMap?.[execDate] || 'dispositivos fijos';
      if (!confirm(`¿Quitar a ${resName} de este dispositivo?`)) return;
      addAssignmentDraft({
        id: `remove-${resId}-${fechaDB}-${turnoFilter}-${turnoId}-${deviceId}`,
        table: 'menu_semana',
        action: 'delete',
        matchParams: { id_agente: resId, id_dispositivo: parseInt(deviceId), fecha_asignacion: fechaDB, id_turno: turnoId },
        payload: { tipo_organizacion: orgType, _ui_name: resName },
        uiDate: execDate
      });
    }
    pushUndo({
      snapshot: { id_agente: resId, fecha_asignacion: fechaDB, id_dispositivo: parseInt(deviceId), estado_ejecucion: 'planificado' }
    });
  };

  // Assign a resident to a closed device (opens cupo)
  const handleAssignToClosedDevice = async (resId: number, targetDeviceId: string) => {
    if (isLoading) return;

    const orgType = tipoOrganizacionMap?.[execDate] || 'dispositivos fijos';
    const toDev = dbDevices.find((d: any) => d.id === targetDeviceId);
    const resName = allResidentsDb.find((r: any) => r.id === resId)?.name || `ID ${resId}`;
    const currentOccupancy = occupancies[resId];
    const toCupo = calendarDb[execDate]?.[targetDeviceId] || 0;

    let message = `¿Asignar a ${resName} en ${toDev?.name}?\n\n`;
    message += `• Se agrega cupo en ${toDev?.name} (${toCupo} → ${toCupo + 1})\n`;
    if (currentOccupancy && !isRotation && !data.allowMultiDispositivoApertura) {
      message += `• Se quita de: ${currentOccupancy.deviceName}\n`;
    }

    if (!confirm(message)) return;

    setIsLoading(true);
    try {
      const newCupo = toCupo + 1;
      const turnoId = dateTurnoMap[execDate] || (isAperturaMode ? 45 : 4);
      
      data.addAssignmentDraft({
        id: `cupo-${execDate}-${targetDeviceId}`,
        table: 'calendario_dispositivos',
        action: 'upsert',
        matchParams: { fecha: fechaDB, id_dispositivo: parseInt(targetDeviceId), id_turno: turnoId },
        payload: { fecha: fechaDB, id_dispositivo: parseInt(targetDeviceId), id_turno: turnoId, cupo_objetivo: newCupo },
        uiDate: execDate
      });

      let convId = agentConvocatoriaMap[execDate]?.[resId];
      if (!convId) {
        try {
          const { data: diaData } = await supabase.from('dias').select('id_dia').eq('fecha', fechaDB).single();
          if (diaData) {
            const { data: convRows } = await supabase.from('convocatoria').select(`id_convocatoria, planificacion!inner(id_turno, id_dia)`)
              .eq('id_agente', resId).eq('estado', 'vigente').eq('planificacion.id_turno', turnoId).eq('planificacion.id_dia', diaData.id_dia).limit(1);
            if (convRows?.[0]) convId = convRows[0].id_convocatoria;
          }
        } catch (err) {}
      }
      
      if (!convId) {
        toast.error('No se encontró convocatoria vigente para este residente.');
        setIsLoading(false);
        return;
      }

      data.addAssignmentDraft({
        id: `op-${resId}-${execDate}-${data.turnoFilter}`,
        table: isAperturaMode ? 'menu' : 'menu_semana',
        action: 'upsert',
        matchParams: { id_agente: resId, fecha_asignacion: fechaDB, ...(isAperturaMode ? {} : { id_turno: turnoId }) },
        payload: { id_agente: resId, id_dispositivo: parseInt(targetDeviceId), fecha_asignacion: fechaDB, estado_ejecucion: 'planificado', id_convocatoria: convId, id_turno: turnoId, tipo_organizacion: orgType, _ui_name: resName },
        uiDate: execDate
      });

      toast.success(`${resName} asignado localmente`);
      setSelectedClosedDevice(null);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error asignando:', err);
      toast.error(`Error: ${err.message || err}`);
      setIsLoading(false);
    }
  };

  /* ── ResidentCard sub-component ── */

  const floorNames: Record<string, { label: string; bgClass: string; borderClass: string }> = {
    '1': { label: 'P1', bgClass: 'bg-[hsl(var(--floor-1-accent))]', borderClass: 'border-[hsl(var(--floor-1-accent))]' },
    '2': { label: 'P2', bgClass: 'bg-[hsl(var(--floor-2-accent))]', borderClass: 'border-[hsl(var(--floor-2-accent))]' },
    '3': { label: 'P3', bgClass: 'bg-[hsl(var(--floor-3-accent))]', borderClass: 'border-[hsl(var(--floor-3-accent))]' },
    '4': { label: 'P4', bgClass: 'bg-muted-foreground', borderClass: 'border-muted-foreground' },
  };

  const multiDeviceResCounts: Record<number, number> = {};
  if (data.allowMultiDispositivoApertura) {
    Object.values(assignmentsDb[execDate] || {}).forEach((arr: any) => {
      (arr || []).forEach((r: any) => {
        multiDeviceResCounts[r.id] = (multiDeviceResCounts[r.id] || 0) + 1;
      });
    });
  }

  const ResidentCard = ({
    res, device, isAbsent, isAcompanante, isEditing,
    visitas, residentFloorCounts,
    aperturaMetricsDb, tardeMananaMetricsDb,
    onToggleAcompana, onQuitar, onGroupEdit, onGroupChange,
    isNonApertura, isRotation,
  }: {
    res: any; device: any;
    isAbsent: boolean; isAcompanante: boolean; isEditing: boolean;
    visitas: any[];
    residentFloorCounts: Record<number, Record<string, number>>;
    aperturaMetricsDb: any; tardeMananaMetricsDb: any;
    onToggleAcompana: (id: number, devId: string, cur: boolean) => void;
    onQuitar: (id: number, devId: string) => void;
    onGroupEdit: () => void;
    onGroupChange: (id: number, devId: string, g: number | null) => void;
    isNonApertura: boolean; isRotation: boolean;
  }) => {
    const floorCounts = residentFloorCounts[res.id] || {};
    const apCount = aperturaMetricsDb?.[res.id]?.deviceReps?.[device.id] || 0;
    const tmCount = tardeMananaMetricsDb?.[res.id]?.deviceReps?.[device.id] || 0;
    const isMultiAssigned = (multiDeviceResCounts[res.id] || 0) > 1;

    return (
      <div className={`p-3 rounded-lg border text-sm ${
        isAbsent ? 'border-dashed border-muted-foreground/30 bg-muted/30' : 'border-border bg-muted/30'
      } ${isMultiAssigned ? 'brightness-90 underline decoration-2 decoration-dotted underline-offset-4' : ''}`}>
        {/* Row 1: name + controls */}
        <div className="flex items-center justify-between gap-1.5">
          <span className={`font-bold truncate ${isAbsent ? 'line-through text-muted-foreground' : getResidentColor(res.id)}`}>
            {isAbsent && '🚫 '}{isAcompanante && '🏫 '}{isAperturaB(res.id) && <Clock className="w-3 h-3 text-amber-500 shrink-0 inline" />}{res.name}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Group badge/editing (rotation modes only) */}
            {!isAbsent && isNonApertura && isRotation && (() => {
              if (isEditing) {
                return (
                    <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                    {[null, 1, 2, 3].map(g => (
                      <button key={g ?? 'x'} onClick={() => onGroupChange(res.id, device.id, g)}
                        className={`text-[11px] px-1.5 py-1 rounded font-mono border transition-all hover:scale-110 ${
                          (Array.isArray(res.numero_grupos) ? res.numero_grupos.includes(g as number) : g === res.numero_grupo)
                            ? 'ring-2 ring-primary font-bold' : ''
                        } ${g != null ? getGroupColor(g) : 'bg-muted text-muted-foreground border-border'}`}>
                        {g != null ? `G${g}` : '✕'}
                      </button>
                    ))}
                  </div>
                );
              }
              if (res.numero_grupo != null || (Array.isArray(res.numero_grupos) && res.numero_grupos.length > 0)) {
                const badgeGroups = Array.isArray(res.numero_grupos) && res.numero_grupos.length > 0
                  ? res.numero_grupos : [res.numero_grupo];
                return (
                  <span
                    onClick={e => { e.stopPropagation(); onGroupEdit(); }}
                    className={`text-[11px] px-1.5 py-1 rounded font-mono border cursor-pointer hover:ring-2 hover:ring-primary/40 hover:scale-110 transition-all ${getGroupColor(res.numero_grupo)}`}>
                    G{badgeGroups.join('/')}
                  </span>
                );
              }
              return (
                <button
                  onClick={e => { e.stopPropagation(); onGroupEdit(); }}
                  className="text-[11px] px-1.5 py-1 rounded font-mono border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-all">
                  +G
                </button>
              );
            })()}

            {/* Acompañar grupo toggle */}
            {!isAbsent && visitas.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleAcompana(res.id, device.id, isAcompanante); }}
                className={`text-[11px] px-2 py-1 rounded border font-bold transition-all hover:scale-105 ${
                  isAcompanante
                    ? 'bg-[hsl(var(--floor-2-bg))] text-[hsl(var(--floor-2-text))] border-[hsl(var(--floor-2-accent))] ring-1 ring-[hsl(var(--floor-2-accent))]'
                    : 'bg-muted text-muted-foreground/50 opacity-60 hover:opacity-100 border-border hover:border-primary hover:text-primary'
                }`}
                title={isAcompanante ? 'Quitar acompañante de grupo' : 'Marcar como acompañante de grupo'}
              >
                🏫
              </button>
            )}

            {/* Quitar button */}
            {!isAbsent && (
              <button
                onClick={(e) => { e.stopPropagation(); onQuitar(res.id, device.id); }}
                className="text-[11px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-all font-bold"
                title="Quitar de este dispositivo"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Row 2: floor device counts + AP/TM badges */}
        {!isAbsent && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
            <div className="flex items-center gap-1.5">
              {Object.entries(floorNames).map(([piso, info]) => (
                <div key={piso}
                  className={`w-[22px] h-[22px] rounded flex items-center justify-center text-[11px] font-bold text-white ${info.bgClass}`}
                  title={`${info.label}: ${floorCounts[piso] || 0} dispositivos`}
                >
                  {floorCounts[piso] || 0}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {apCount > 0 && (
                <span className="text-[10px] font-bold bg-[hsl(var(--floor-1-bg))] text-[hsl(var(--floor-1-text))] px-2 py-1 rounded border border-[hsl(var(--floor-1-border))]">
                  AP: {apCount}
                </span>
              )}
              {tmCount > 0 && (
                <span className="text-[10px] font-bold bg-[hsl(var(--floor-2-bg))] text-[hsl(var(--floor-2-text))] px-2 py-1 rounded border border-[hsl(var(--floor-2-border))]">
                  T/M: {tmCount}
                </span>
              )}
              {apCount === 0 && tmCount === 0 && (
                <span className="text-[10px] text-muted-foreground/50 italic">sin datos</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Build resident list for closed device sidebar
  const buildResidentList = (targetDeviceId: string) => {
    type ListItem = { id: number; name: string; category: string; isBusy: boolean; isAbsent: boolean; busyDevice?: string; apCount: number; tmCount: number };
    const tier1: ListItem[] = [];
    const tier2: ListItem[] = [];
    const tier3: ListItem[] = [];
    const tier4: ListItem[] = [];

    allResidentsDb.forEach((res: any) => {
      const isConvocado = convocadoIds.has(res.id);
      const capDate = res.caps[targetDeviceId];
      const isCapacitado = !!capDate && capDate <= fechaDB;
      const isAbsent = isAgentAbsent(res.id, execDate);
      const occ = occupancies[res.id];

      if (isAbsent) return;

      const apCount = aperturaMetricsDb?.[res.id]?.deviceReps?.[targetDeviceId] || 0;
      const tmCount = tardeMananaMetricsDb?.[res.id]?.deviceReps?.[targetDeviceId] || 0;

      const item: ListItem = {
        id: res.id, name: res.name,
        category: isConvocado ? (isCapacitado ? 'conv+cap' : 'conv+nocap') : (isCapacitado ? 'desc+cap' : 'desc+nocap'),
        isBusy: !!occ, isAbsent,
        busyDevice: occ?.deviceName,
        apCount, tmCount,
      };

      if (isConvocado && isCapacitado) tier1.push(item);
      else if (isConvocado && !isCapacitado) tier2.push(item);
      else if (!isConvocado && isCapacitado) tier3.push(item);
      else tier4.push(item);
    });

    return { tier1, tier2, tier3, tier4 };
  };

  return (
    <div className="space-y-6">
      {/* ══════ VISITAS GRUPALES (context from mañana/tarde) ══════ */}
      {visitas.length > 0 && (
        <div className="space-y-3">
          <VisitBlock
            visitas={visitas}
            locked={false}
            interactive={true}
            onGroupChange={() => refresh()}
            onObservaciones={(idAsig, nombre) => setObservacionesVisit({ open: true, idAsignacion: idAsig, nombre })}
          />

          {/* ══════ ACOMPAÑANTES DE GRUPO ══════ */}
          {(() => {
            const acompanantesMap = new Map<number, { id: number; name: string; devices: { name: string; grupo: number | null }[] }>();
            Object.entries(assignmentsDb[execDate] || {}).forEach(([devId, arr]: [string, any]) => {
              const devObj = dbDevices.find((dd: any) => dd.id === devId);
              arr.forEach((r: any) => {
                if (r.acompana_grupo && !isAgentAbsent(r.id, execDate)) {
                  if (!acompanantesMap.has(r.id)) {
                    acompanantesMap.set(r.id, { id: r.id, name: r.name, devices: [] });
                  }
                  acompanantesMap.get(r.id)!.devices.push({
                    name: devObj?.name || devId,
                    grupo: r.numero_grupo ?? null,
                  });
                }
              });
            });
            const acompanantes = Array.from(acompanantesMap.values());
            if (acompanantes.length === 0) return null;
            return (
              <div className="rounded-xl border-2 border-[hsl(var(--floor-2-border))] bg-[hsl(var(--floor-2-bg))] overflow-hidden">
                <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-[hsl(var(--floor-2-border))]/50 flex items-center gap-2">
                  <span className="text-sm sm:text-base">🏫</span>
                  <span className="font-black text-xs sm:text-sm tracking-wide text-[hsl(var(--floor-2-text))]">
                    Acompañantes de Grupo ({acompanantes.length})
                  </span>
                </div>
                <div className="p-2 sm:p-3 space-y-1">
                  {acompanantes.map((a) => (
                    <div key={`acomp-${a.id}`} className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-[hsl(var(--floor-2-border))]/30 bg-card text-[11px] sm:text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground truncate flex items-center gap-1">
                          🏫 {isAperturaB(a.id) && <Clock className="w-3 h-3 text-amber-500 shrink-0" />}
                          {a.name}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {a.devices.map((d, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 text-[10px]">
                            📍 {d.name}
                            {d.grupo != null && (
                              <span className={`text-[9px] font-bold px-1 py-0.5 rounded border ${getGroupColor(d.grupo)}`}>
                                G{d.grupo}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Open Devices */}
      <div>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-[hsl(var(--score-high-text))]" /> Dispositivos Abiertos ({openDevices.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {openDevices.map(({ device, assignments }) => {
            // Filter by visibleGroups in rotation mode
            let filteredAssignments = assignments;
            if (visibleGroups && Object.keys(visibleGroups).length > 0 && isRotation) {
              filteredAssignments = assignments.filter((res: any) => {
                const groups = Array.isArray(res.numero_grupos)
                  ? res.numero_grupos
                  : (res.numero_grupo != null ? [res.numero_grupo] : []);
                return groups.length === 0 || groups.some((g: number) => visibleGroups[g]);
              });
            }

            // In rotation mode, group residents by group number
            const grouped: Record<string, any[]> = {};
            if (isRotation && filteredAssignments.length > 0) {
              filteredAssignments.forEach((res: any) => {
                const groups = Array.isArray(res.numero_grupos)
                  ? res.numero_grupos
                  : (res.numero_grupo != null ? [res.numero_grupo] : [0]);
                const key = groups.join(',') || '0';
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(res);
              });
            }

            const hasGrouping = Object.keys(grouped).length > 0;

            return (
              <div key={device.id} className="rounded-xl border overflow-hidden transition-all shadow-sm hover:shadow">
                <div className={`px-3 py-2 border-b flex items-center justify-between cursor-pointer ${getFloorColor(device.name)}`}
                  onClick={() => { setSelectedDevice({ id: device.id, name: device.name }); setSelectedDateFilter(execDate); }}>
                  <h4 className="font-bold text-sm truncate">{device.name}</h4>
                  <span className="text-[11px] font-mono bg-card/50 px-2 py-1 rounded border border-border/50">{filteredAssignments.length} res.</span>
                </div>
                <div className="p-3 bg-card space-y-2">
                  {!hasGrouping
                    ? filteredAssignments.map((res: any, i: number) => (
                        <ResidentCard
                          key={`${res.id}-${i}`}
                          res={res} device={device}
                          isAbsent={isAgentAbsent(res.id, execDate)}
                          isAcompanante={!!res.acompana_grupo}
                          isEditing={editingGroup === `${device.id}-${res.id}`}
                          visitas={visitas}
                          residentFloorCounts={residentFloorCounts}
                          aperturaMetricsDb={aperturaMetricsDb}
                          tardeMananaMetricsDb={tardeMananaMetricsDb}
                          onToggleAcompana={handleToggleAcompana}
                          onQuitar={handleQuitar}
                          onGroupEdit={() => setEditingGroup(editingGroup === `${device.id}-${res.id}` ? null : `${device.id}-${res.id}`)}
                          onGroupChange={handleGroupChange}
                          isNonApertura={isNonApertura}
                          isRotation={isRotation}
                        />
                      ))
                    : Object.entries(grouped)
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([groupKey, groupResidents]) => (
                          <div key={groupKey}>
                            <div className="text-[11px] font-bold py-1.5 px-1.5 text-muted-foreground uppercase tracking-wider">
                              Grupo {groupKey}
                            </div>
                            {groupResidents.map((res: any, i: number) => (
                              <ResidentCard
                                key={`${res.id}-${i}`}
                                res={res} device={device}
                                isAbsent={isAgentAbsent(res.id, execDate)}
                                isAcompanante={!!res.acompana_grupo}
                                isEditing={editingGroup === `${device.id}-${res.id}`}
                                visitas={visitas}
                                residentFloorCounts={residentFloorCounts}
                                aperturaMetricsDb={aperturaMetricsDb}
                                tardeMananaMetricsDb={tardeMananaMetricsDb}
                                onToggleAcompana={handleToggleAcompana}
                                onQuitar={handleQuitar}
                                onGroupEdit={() => setEditingGroup(editingGroup === `${device.id}-${res.id}` ? null : `${device.id}-${res.id}`)}
                                onGroupChange={handleGroupChange}
                                isNonApertura={isNonApertura}
                                isRotation={isRotation}
                              />
                            ))}
                          </div>
                        ))
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Closed Devices */}
      <div>
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4" /> Dispositivos Cerrados ({closedDevices.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {closedDevices.map(({ device }) => (
            <div key={device.id} className={`rounded-xl border overflow-hidden transition-all ${
              selectedClosedDevice === device.id ? 'ring-2 ring-primary shadow-md' : 'shadow-sm hover:shadow border-dashed'
            }`}>
              <div className={`px-3 py-2 border-b flex items-center justify-between cursor-pointer opacity-70 hover:opacity-100 transition-opacity ${getFloorColor(device.name)}`}
                onClick={() => setSelectedClosedDevice(selectedClosedDevice === device.id ? null : device.id)}>
                <h4 className="font-bold text-sm truncate">{device.name}</h4>
                <span className="text-[11px] font-mono text-muted-foreground">Sin cupo</span>
              </div>

              {selectedClosedDevice === device.id && (() => {
                const { tier1, tier2, tier3, tier4 } = buildResidentList(device.id);

                const renderTier = (title: string, items: typeof tier1, colorClass: string, Icon: any) => (
                  items.length > 0 && (
                        <div className="mb-3">
                      <span className={`text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${colorClass}`}>
                        <Icon className="w-3.5 h-3.5" /> {title} ({items.length})
                      </span>
                      <div className="space-y-1">
                        {items.map(item => (
                          <button key={item.id}
                            onClick={() => handleAssignToClosedDevice(item.id, device.id)}
                            className="w-full text-left p-2.5 rounded-lg border text-sm transition-all flex justify-between items-center border-border bg-card hover:border-primary/40 cursor-pointer hover:shadow-sm">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold">{item.name}</span>
                              <div className="flex items-center gap-0.5">
                                {item.apCount > 0 && (
                                  <span className="text-[9px] font-bold bg-[hsl(var(--floor-1-bg))] text-[hsl(var(--floor-1-text))] px-1 py-0.5 rounded border border-[hsl(var(--floor-1-border))]">
                                    AP: {item.apCount}
                                  </span>
                                )}
                                {item.tmCount > 0 && (
                                  <span className="text-[9px] font-bold bg-[hsl(var(--floor-2-bg))] text-[hsl(var(--floor-2-text))] px-1 py-0.5 rounded border border-[hsl(var(--floor-2-border))]">
                                    T/M: {item.tmCount}
                                  </span>
                                )}
                              </div>
                              {item.isBusy && (
                                <span className="ml-1.5 text-[11px] text-[hsl(var(--score-mid-text))] font-mono">← {item.busyDevice}</span>
                              )}
                            </div>
                            {item.isBusy ? (
                              <span className="text-[11px] bg-[hsl(var(--score-mid-bg))] text-[hsl(var(--score-mid-text))] px-2 py-1 rounded border border-[hsl(var(--score-mid-border))] font-bold">
                                {isAperturaMode && data.allowMultiDispositivoApertura ? 'Agregar' : 'Traslado'}
                              </span>
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                );

                return (
                  <div className="p-3 bg-card max-h-[400px] overflow-y-auto">
                    {renderTier("Convocado + Capacitado", tier1, "text-[hsl(var(--score-high-text))]", Check)}
                    {renderTier("Convocado + No Capacitado", tier2, "text-[hsl(var(--score-mid-text))]", AlertCircle)}
                    {renderTier("Descanso + Capacitado", tier3, "text-primary", Moon)}
                    {renderTier("Descanso + No Capacitado", tier4, "text-muted-foreground", AlertCircle)}
                    {tier1.length + tier2.length + tier3.length + tier4.length === 0 && (
                      <div className="text-sm text-muted-foreground italic py-4 text-center">No hay residentes disponibles</div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </div>

      {/* ══════ POPUP OBSERVACIONES ══════ */}
      {observacionesVisit.open && observacionesVisit.idAsignacion && (
        <ObservacionesPopup
          idAsignacion={observacionesVisit.idAsignacion}
          nombre={observacionesVisit.nombre}
          observacionesReferente={visitas.find(v => v.id_asignacion === observacionesVisit.idAsignacion)?.observaciones || null}
          llamados={llamadosByAsignacion[observacionesVisit.idAsignacion] || []}
          onClose={() => setObservacionesVisit({ open: false, idAsignacion: null, nombre: '' })}
        />
      )}
    </div>
  );
};
