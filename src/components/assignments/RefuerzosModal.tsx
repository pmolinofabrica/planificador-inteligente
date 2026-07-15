import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { getPisoBadgeColor, getFloorAccent } from '@/lib/floor-utils';
import type { DeviceInfo, AssignmentsMatrix } from '@/types/assignments';

interface RefuerzosModalProps {
  open: boolean;
  onClose: () => void;
  activeDates: string[];
  devices: DeviceInfo[];
  assignmentsDb: AssignmentsMatrix;
  turnoFilter: string;
  dateTurnoMap: Record<string, number>;
  tipoOrganizacionMap: Record<string, string>;
  onSaved: () => void;
  year: string;
  showRefuerzos: boolean;
  onToggleShow: (v: boolean) => void;
}

export const RefuerzosModal: React.FC<RefuerzosModalProps> = ({
  open, onClose, activeDates, devices, assignmentsDb, turnoFilter, dateTurnoMap, tipoOrganizacionMap, onSaved, year,
  showRefuerzos, onToggleShow
}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [refuerzoResidents, setRefuerzoResidents] = useState<{ id_agente: number; name: string }[]>([]);
  const [assignments, setAssignments] = useState<Record<number, { id_dispositivo: string; grupo: number | null }>>({});
  const [showDeviceSummary, setShowDeviceSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const residentsLoaded = useRef(false);

  const orgType = tipoOrganizacionMap[selectedDate] || 'dispositivos fijos';
  const isRotacion = orgType === 'rotacion completa' || orgType === 'rotacion simple';

  // Set initial date when modal opens
  useEffect(() => {
    if (open && activeDates.length > 0 && !selectedDate) {
      setSelectedDate(activeDates[0]);
    }
  }, [open, activeDates, selectedDate]);

  // Load refuerzo residents once per modal open
  useEffect(() => {
    if (!open) {
      residentsLoaded.current = false;
      return;
    }
    if (residentsLoaded.current) return;
    residentsLoaded.current = true;
    (async () => {
      const { data } = await supabase
        .from('datos_personales')
        .select('id_agente, nombre, apellido, periodo_refuerzo')
        .eq('refuerzo', true);
      if (data) {
        const filtered = data.filter(r => {
          if (!r.periodo_refuerzo || r.periodo_refuerzo.length === 0) return true;
          return r.periodo_refuerzo.includes(Number(year));
        });
        setRefuerzoResidents(filtered.map(r => ({ id_agente: r.id_agente, name: `${r.apellido} ${r.nombre}` })));
      }
    })();
  }, [open, year]);

  // Load assignments directly from DB when date changes
  useEffect(() => {
    if (!selectedDate) return;
    const [dd, mm] = selectedDate.split('/');
    const fechaStr = `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    (async () => {
      const { data } = await supabase
        .from('refuerzos_asignaciones')
        .select('*')
        .eq('fecha', fechaStr);
      const curMap: Record<number, { id_dispositivo: string; grupo: number | null }> = {};
      if (data) {
        data.forEach(r => {
          curMap[r.id_agente] = {
            id_dispositivo: String(r.id_dispositivo),
            grupo: r.numero_grupo ?? null,
          };
        });
      }
      setAssignments(curMap);
    })();
  }, [selectedDate, year]);

  const handleDeviceChange = (agentId: number, deviceId: string) => {
    setAssignments(prev => ({ ...prev, [agentId]: { id_dispositivo: deviceId, grupo: prev[agentId]?.grupo ?? null } }));
  };

  const handleGroupChange = (agentId: number, grupo: number | null) => {
    setAssignments(prev => ({ ...prev, [agentId]: { id_dispositivo: prev[agentId]?.id_dispositivo || '', grupo } }));
  };

  const assignAllEmpty = () => {
    const firstId = devices[0]?.id;
    if (!firstId) return;
    setAssignments(prev => {
      const next = { ...prev };
      refuerzoResidents.forEach(r => {
        if (!next[r.id_agente]) {
          next[r.id_agente] = { id_dispositivo: firstId, grupo: null };
        }
      });
      return next;
    });
  };

  const handleRemove = (agentId: number) => {
    setAssignments(prev => {
      const next = { ...prev };
      delete next[agentId];
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const idTurno = dateTurnoMap[selectedDate] || null;
      const [dd, mm] = selectedDate.split('/');
      const fechaStr = `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;

      const desiredAgents = Object.entries(assignments)
        .filter(([, v]) => v.id_dispositivo)
        .map(([agentId]) => Number(agentId));

      // Delete records for agents NOT in the desired set
      if (desiredAgents.length > 0) {
        const agentList = desiredAgents.join(',');
        await supabase
          .from('refuerzos_asignaciones')
          .delete()
          .eq('fecha', fechaStr)
          .not('id_agente', 'in', `(${agentList})`);
      } else {
        await supabase
          .from('refuerzos_asignaciones')
          .delete()
          .eq('fecha', fechaStr);
      }

      // Upsert desired records
      if (desiredAgents.length > 0) {
        const rows = desiredAgents.map(agentId => ({
          id_agente: agentId,
          id_dispositivo: Number(assignments[agentId].id_dispositivo),
          fecha: fechaStr,
          id_turno: idTurno,
          numero_grupo: assignments[agentId].grupo,
        }));
        const { error } = await supabase
          .from('refuerzos_asignaciones')
          .upsert(rows, { onConflict: 'id_agente, fecha' });
        if (error) throw error;
      }

      onSaved();
      onClose();
    } catch (err: any) {
      alert(`Error al guardar refuerzos: ${err?.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-card rounded-xl border shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold flex items-center gap-2">💪 Refuerzos</h2>
          <div className="flex items-center gap-3">
            <Switch checked={showRefuerzos} onCheckedChange={onToggleShow} />
            <button onClick={onClose} className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground">✕</button>
          </div>
        </div>

        {/* Date selector + device summary toggle */}
        <div className="px-5 py-2 border-b border-border bg-muted/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Fecha:</span>
              <select
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="text-xs font-bold bg-card border border-border rounded px-2 py-1 outline-none"
              >
                {activeDates.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowDeviceSummary(v => !v)}
              className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              {showDeviceSummary ? '▲' : '▼'} Asignaciones
            </button>
          </div>
          {showDeviceSummary && selectedDate && (
            <div className="max-h-44 overflow-y-auto space-y-1.5 bg-card rounded-lg border border-border p-2">
              {devices.map(dev => {
                const assigned = (assignmentsDb[selectedDate]?.[dev.id] || []);
                const pisoKey = `P${dev.piso}`;
                const pisoColor = getPisoBadgeColor(pisoKey);
                const dotColor = getFloorAccent(dev.piso);
                return (
                  <div key={dev.id} className={`rounded-lg border px-2 py-1.5 ${pisoColor}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                      <span className="font-bold text-[10px]">{dev.name.replace(/\s*\(P\d\)\s*/g, '')}</span>
                      <span className="text-[8px] font-medium opacity-60 ml-auto">{assigned.length} asignados</span>
                    </div>
                    {assigned.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {assigned.map((r: any) => (
                          <span key={r.id} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/60 dark:bg-black/20">
                            {r.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[9px] opacity-50 italic">Sin residentes</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {refuerzoResidents.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No hay residentes marcados como refuerzo.</p>
          )}
          {refuerzoResidents.map(res => {
            const assigned = assignments[res.id_agente];
            return (
              <div key={res.id_agente} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30">
                <span className="font-bold text-xs flex-1 truncate">{res.name}</span>
                {assigned ? (
                  <>
                    <select
                      value={assigned.id_dispositivo}
                      onChange={e => handleDeviceChange(res.id_agente, e.target.value)}
                      className="text-[10px] font-medium bg-card border border-border rounded px-1.5 py-1 outline-none max-w-[120px]"
                    >
                      {devices.map(d => (
                        <option key={d.id} value={d.id}>{d.name.replace(/\s*\(P\d\)\s*/g, '')}</option>
                      ))}
                    </select>
                    {isRotacion && (
                      <select
                        value={assigned.grupo ?? ''}
                        onChange={e => handleGroupChange(res.id_agente, e.target.value ? Number(e.target.value) : null)}
                        className="text-[10px] font-medium bg-card border border-border rounded px-1.5 py-1 outline-none w-14"
                      >
                        <option value="">—</option>
                        {[1, 2, 3].map(g => <option key={g} value={g}>G{g}</option>)}
                      </select>
                    )}
                    <button onClick={() => handleRemove(res.id_agente)} className="p-1 text-muted-foreground hover:text-destructive transition-colors text-xs">✕</button>
                  </>
                ) : (
                  <button
                    onClick={() => handleDeviceChange(res.id_agente, devices[0]?.id || '')}
                    className="text-[10px] font-bold px-2 py-1 rounded border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    + Asignar
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
          <button onClick={assignAllEmpty} className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors">
            + Asignar todos
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
