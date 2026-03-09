import React, { useState } from 'react';
import { Monitor, ArrowRightLeft, Plus, Check, AlertCircle, Moon, Lock } from 'lucide-react';
import { getFloorColor } from '@/lib/floor-utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VisitBlock } from './VisitBadge';

interface AperturaDevicesPanelProps {
  data: any;
  execDate: string;
  pushUndo: (entry: any) => void;
  year: string;
}

export const AperturaDevicesPanel: React.FC<AperturaDevicesPanelProps> = ({
  data, execDate, pushUndo, year,
}) => {
  const {
    dbDevices, assignmentsDb, calendarDb, setCalendarDb,
    convocadosDb, allResidentsDb, isAgentAbsent,
    agentConvocatoriaMap, isLoading, setIsLoading, refresh,
    visitasByDate,
  } = data;

  const [selectedOpenDevice, setSelectedOpenDevice] = useState<string | null>(null);
  const [selectedClosedDevice, setSelectedClosedDevice] = useState<string | null>(null);

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

  // Toggle acompaña_grupo for a resident in apertura (menu table)
  const handleToggleAcompana = async (resId: number, deviceId: string, current: boolean) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const updateObj: any = {};
      updateObj['acompa\u00f1a_grupo'] = !current;
      const { error, data: updated } = await supabase.from('menu')
        .update(updateObj)
        .eq('id_agente', resId)
        .eq('fecha_asignacion', fechaDB)
        .eq('id_dispositivo', parseInt(deviceId))
        .select();
      if (error) throw error;
      if (!updated || updated.length === 0) {
        console.warn('[AcompañaGrupo] Update matched 0 rows', { resId, fechaDB, deviceId });
        toast.error('No se encontró la fila para actualizar');
        setIsLoading(false);
        return;
      }
      toast.success(!current ? 'Marcado como acompañante' : 'Desmarcado como acompañante');
      refresh();
    } catch (err: any) {
      console.error('Error toggling acompaña_grupo:', err);
      toast.error(`Error: ${err.message || err}`);
      setIsLoading(false);
    }
  };

  // Transfer resident from one device to another
  const handleTransfer = async (resId: number, fromDeviceId: string, toDeviceId: string) => {
    if (isLoading) return;

    const fromDev = dbDevices.find((d: any) => d.id === fromDeviceId);
    const toDev = dbDevices.find((d: any) => d.id === toDeviceId);
    const toCupo = calendarDb[execDate]?.[toDeviceId] || 0;
    const toAssigned = assignmentsDb[execDate]?.[toDeviceId]?.length || 0;
    const resName = allResidentsDb.find((r: any) => r.id === resId)?.name || `ID ${resId}`;

    let message = `¿Trasladar a ${resName}?\n\n`;
    message += `• Se quita de: ${fromDev?.name}\n`;

    if (toCupo === 0 || toAssigned >= toCupo) {
      message += `• Se abre cupo en: ${toDev?.name} (cupo actual: ${toCupo} → ${toCupo + 1})\n`;
    }
    message += `• Se asigna a: ${toDev?.name}`;

    if (!confirm(message)) return;

    setIsLoading(true);
    try {
      if (toCupo === 0 || toAssigned >= toCupo) {
        const newCupo = (toCupo || 0) + 1;
        const turnoId = 4;
        await supabase.from('calendario_dispositivos')
          .upsert({
            fecha: fechaDB, id_turno: turnoId,
            id_dispositivo: parseInt(toDeviceId), cupo_objetivo: newCupo,
          }, { onConflict: 'fecha, id_turno, id_dispositivo' });
        
        setCalendarDb((prev: any) => {
          const next = { ...prev };
          if (!next[execDate]) next[execDate] = {};
          next[execDate] = { ...next[execDate], [toDeviceId]: newCupo };
          return next;
        });
      }

      const { error } = await supabase.from('menu')
        .update({ id_dispositivo: parseInt(toDeviceId) })
        .eq('id_agente', resId)
        .eq('fecha_asignacion', fechaDB)
        .eq('id_dispositivo', parseInt(fromDeviceId));

      if (error) throw error;

      pushUndo({ snapshot: { id_agente: resId, fecha_asignacion: fechaDB, id_dispositivo: parseInt(fromDeviceId) } });
      toast.success(`${resName} trasladado a ${toDev?.name}`);
      setSelectedOpenDevice(null);
      refresh();
    } catch (err: any) {
      console.error('Error trasladando:', err);
      toast.error(`Error: ${err.message || err}`);
      setIsLoading(false);
    }
  };

  // Assign a resident to a closed device (opens cupo)
  const handleAssignToClosedDevice = async (resId: number, targetDeviceId: string) => {
    if (isLoading) return;

    const toDev = dbDevices.find((d: any) => d.id === targetDeviceId);
    const resName = allResidentsDb.find((r: any) => r.id === resId)?.name || `ID ${resId}`;
    const currentOccupancy = occupancies[resId];
    const toCupo = calendarDb[execDate]?.[targetDeviceId] || 0;

    let message = `¿Asignar a ${resName} en ${toDev?.name}?\n\n`;
    message += `• Se agrega cupo en ${toDev?.name} (${toCupo} → ${toCupo + 1})\n`;
    if (currentOccupancy) {
      message += `• Se quita de: ${currentOccupancy.deviceName}\n`;
    }

    if (!confirm(message)) return;

    setIsLoading(true);
    try {
      const newCupo = toCupo + 1;
      const turnoId = 4;
      await supabase.from('calendario_dispositivos')
        .upsert({
          fecha: fechaDB, id_turno: turnoId,
          id_dispositivo: parseInt(targetDeviceId), cupo_objetivo: newCupo,
        }, { onConflict: 'fecha, id_turno, id_dispositivo' });

      setCalendarDb((prev: any) => {
        const next = { ...prev };
        if (!next[execDate]) next[execDate] = {};
        next[execDate] = { ...next[execDate], [targetDeviceId]: newCupo };
        return next;
      });

      if (currentOccupancy) {
        const { error } = await supabase.from('menu')
          .update({ id_dispositivo: parseInt(targetDeviceId) })
          .eq('id_agente', resId)
          .eq('fecha_asignacion', fechaDB)
          .eq('id_dispositivo', parseInt(currentOccupancy.deviceId));
        if (error) throw error;
        pushUndo({ snapshot: { id_agente: resId, fecha_asignacion: fechaDB, id_dispositivo: parseInt(currentOccupancy.deviceId) } });
      } else {
        let convId = agentConvocatoriaMap[execDate]?.[resId];
        if (!convId) {
          const { data: convRows } = await supabase
            .from('convocatoria').select('id_convocatoria')
            .eq('id_agente', resId).eq('fecha_convocatoria', fechaDB).eq('estado', 'vigente').limit(1);
          if (convRows?.[0]) convId = convRows[0].id_convocatoria;
        }
        if (!convId) {
          toast.error('No se encontró convocatoria vigente para este residente.');
          setIsLoading(false);
          return;
        }

        const { data: existing } = await supabase.from('menu').select('*')
          .eq('id_agente', resId).eq('fecha_asignacion', fechaDB);

        if (existing && existing.length > 0) {
          const { error } = await supabase.from('menu')
            .update({ id_dispositivo: parseInt(targetDeviceId) })
            .eq('id_agente', resId).eq('fecha_asignacion', fechaDB);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('menu').insert([{
            id_agente: resId, id_dispositivo: parseInt(targetDeviceId),
            fecha_asignacion: fechaDB, estado_ejecucion: 'planificado', id_convocatoria: convId,
          }]);
          if (error) throw error;
        }
        pushUndo({ snapshot: { id_agente: resId, fecha_asignacion: fechaDB, _isInsert: true } });
      }

      toast.success(`${resName} asignado a ${toDev?.name}`);
      setSelectedClosedDevice(null);
      refresh();
    } catch (err: any) {
      console.error('Error asignando:', err);
      toast.error(`Error: ${err.message || err}`);
      setIsLoading(false);
    }
  };

  // Build resident list for closed device sidebar
  const buildResidentList = (targetDeviceId: string) => {
    type ListItem = { id: number; name: string; category: string; isBusy: boolean; isAbsent: boolean; busyDevice?: string };
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

      const item: ListItem = {
        id: res.id, name: res.name,
        category: isConvocado ? (isCapacitado ? 'conv+cap' : 'conv+nocap') : (isCapacitado ? 'desc+cap' : 'desc+nocap'),
        isBusy: !!occ, isAbsent,
        busyDevice: occ?.deviceName,
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
        <div>
          <VisitBlock visitas={visitas} locked={false} interactive={false} onGroupChange={() => refresh()} />
        </div>
      )}

      {/* Open Devices */}
      <div>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-[hsl(var(--score-high-text))]" /> Dispositivos Abiertos ({openDevices.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {openDevices.map(({ device, assignments }) => (
            <div key={device.id} className={`rounded-xl border overflow-hidden transition-all ${
              selectedOpenDevice === device.id ? 'ring-2 ring-primary shadow-md' : 'shadow-sm hover:shadow'
            }`}>
              <div className={`px-3 py-2 border-b flex items-center justify-between cursor-pointer ${getFloorColor(device.name)}`}
                onClick={() => setSelectedOpenDevice(selectedOpenDevice === device.id ? null : device.id)}>
                <h4 className="font-bold text-xs truncate">{device.name}</h4>
                <span className="text-[9px] font-mono bg-card/50 px-1.5 py-0.5 rounded border border-border/50">{assignments.length} res.</span>
              </div>
              <div className="p-2 bg-card space-y-1.5">
                {assignments.map((res: any, i: number) => {
                  const isAbsent = isAgentAbsent(res.id, execDate);
                  const isAcompanante = !!res.acompana_grupo;
                  return (
                    <div key={`${res.id}-${i}`} className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                      isAbsent ? 'border-dashed border-muted-foreground/30 bg-muted/30' : 'border-border bg-muted/30'
                    }`}>
                      <span className={`font-bold ${isAbsent ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {isAbsent && '🚫 '}{isAcompanante && '🏫 '}{res.name}
                      </span>
                      {/* Acompañar grupo toggle */}
                      {!isAbsent && visitas.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleAcompana(res.id, device.id, isAcompanante); }}
                          className={`text-[9px] px-1.5 py-0.5 rounded border font-bold transition-all hover:scale-105 ${
                            isAcompanante
                              ? 'bg-[hsl(var(--floor-2-bg))] text-[hsl(var(--floor-2-text))] border-[hsl(var(--floor-2-border))]'
                              : 'bg-muted text-muted-foreground border-border hover:border-primary'
                          }`}
                          title={isAcompanante ? 'Quitar acompañante de grupo' : 'Marcar como acompañante de grupo'}
                        >
                          🏫
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Transfer panel */}
              {selectedOpenDevice === device.id && (
                <div className="p-3 border-t border-border bg-accent/30">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                    <ArrowRightLeft className="w-3 h-3 inline mr-1" /> Trasladar a otro dispositivo
                  </span>
                  {assignments.map((res: any) => {
                    if (isAgentAbsent(res.id, execDate)) return null;
                    return (
                      <div key={res.id} className="mb-3">
                        <span className="text-xs font-bold text-foreground block mb-1.5">{res.name}:</span>
                        <div className="flex flex-wrap gap-1">
                          {dbDevices
                            .filter((d: any) => d.id !== device.id)
                            .map((targetDev: any) => {
                              const tCupo = calendarDb[execDate]?.[targetDev.id] || 0;
                              const tAssigned = assignmentsDb[execDate]?.[targetDev.id]?.length || 0;
                              const isClosed = tCupo === 0;
                              const isFull = tAssigned >= tCupo && tCupo > 0;
                              return (
                                <button key={targetDev.id}
                                  onClick={() => handleTransfer(res.id, device.id, targetDev.id)}
                                  className={`text-[9px] px-2 py-1 rounded-md border font-bold transition-all hover:scale-105 ${
                                    isClosed
                                      ? 'border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary'
                                      : isFull
                                        ? 'border-[hsl(var(--score-mid-border))] bg-[hsl(var(--score-mid-bg))] text-[hsl(var(--score-mid-text))] hover:border-primary'
                                        : 'border-[hsl(var(--score-high-border))] bg-[hsl(var(--score-high-bg))] text-[hsl(var(--score-high-text))] hover:border-primary'
                                  }`}
                                  title={isClosed ? 'Sin cupo — se abrirá' : isFull ? 'Lleno — se agregará cupo' : `${tAssigned}/${tCupo}`}
                                >
                                  {targetDev.name.length > 20 ? targetDev.name.substring(0, 18) + '…' : targetDev.name}
                                  {isClosed && ' 🔒'}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
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
                <h4 className="font-bold text-xs truncate">{device.name}</h4>
                <span className="text-[9px] font-mono text-muted-foreground">Sin cupo</span>
              </div>

              {selectedClosedDevice === device.id && (() => {
                const { tier1, tier2, tier3, tier4 } = buildResidentList(device.id);

                const renderTier = (title: string, items: typeof tier1, colorClass: string, Icon: any) => (
                  items.length > 0 && (
                    <div className="mb-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${colorClass}`}>
                        <Icon className="w-3 h-3" /> {title} ({items.length})
                      </span>
                      <div className="space-y-1">
                        {items.map(item => (
                          <button key={item.id}
                            onClick={() => handleAssignToClosedDevice(item.id, device.id)}
                            className="w-full text-left p-2 rounded-lg border text-xs transition-all flex justify-between items-center border-border bg-card hover:border-primary/40 cursor-pointer hover:shadow-sm">
                            <div>
                              <span className="font-bold">{item.name}</span>
                              {item.isBusy && (
                                <span className="ml-1.5 text-[9px] text-[hsl(var(--score-mid-text))] font-mono">← {item.busyDevice}</span>
                              )}
                            </div>
                            {item.isBusy ? (
                              <span className="text-[9px] bg-[hsl(var(--score-mid-bg))] text-[hsl(var(--score-mid-text))] px-1.5 py-0.5 rounded border border-[hsl(var(--score-mid-border))] font-bold">Traslado</span>
                            ) : (
                              <Plus className="w-3 h-3 text-primary" />
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
                      <div className="text-xs text-muted-foreground italic py-4 text-center">No hay residentes disponibles</div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
