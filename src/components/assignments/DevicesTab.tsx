import React from 'react';
import { Settings } from 'lucide-react';
import { VisitChip, VisitDetailChip } from './VisitBadge';
import { getFloorColor } from '@/lib/floor-utils';
import { supabase } from '@/integrations/supabase/client';

interface DevicesTabProps {
  data: any;
  year: string;
}

const ORG_TYPES = ['dispositivos fijos', 'rotacion simple', 'rotacion completa'] as const;
const ORG_LABELS: Record<string, string> = {
  'dispositivos fijos': 'Fija',
  'rotacion simple': 'Rot. Simple',
  'rotacion completa': 'Rot. Completa',
};

export const DevicesTab: React.FC<DevicesTabProps> = ({ data, year }) => {
  const {
    dbDevices, activeDates, assignmentsDb, calendarDb, setCalendarDb,
    convocadosCountDb, dateTurnoMap, inasistenciasDb,
    isLoading, setIsLoading, refresh,
    turnoFilter, tipoOrganizacionMap, setTipoOrganizacionMap,
    visitasByDate,
  } = data;

  const isNonApertura = turnoFilter === 'tarde' || turnoFilter === 'manana';

  const handleOrgTypeChange = async (date: string, newType: string) => {
    const [d, m] = date.split('/');
    const fechaDB = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    let defaultTurnoId = 4;
    if (turnoFilter === 'manana') defaultTurnoId = 3;
    if (turnoFilter === 'apertura') defaultTurnoId = 45;

    const turnoId = dateTurnoMap[date] || defaultTurnoId;
    const prev = tipoOrganizacionMap[date] || 'dispositivos fijos';

    setTipoOrganizacionMap((old: Record<string, string>) => ({ ...old, [date]: newType }));

    try {
      const { error } = await supabase
        .from('configuracion_turnos')
        .upsert({ 
          fecha: fechaDB, 
          id_turno: turnoId, 
          tipo_organizacion: newType 
        });
      if (error) throw error;
    } catch (err) {
      console.error('Error updating org type:', err);
      setTipoOrganizacionMap((old: Record<string, string>) => ({ ...old, [date]: prev }));
    }
  };

  const handleSave = async () => {
    if (isLoading) return;

    // Validate cupos
    for (const strDate of Object.keys(calendarDb)) {
      for (const devId of Object.keys(calendarDb[strDate])) {
        const cupo = calendarDb[strDate][devId];
        const asigCount = assignmentsDb[strDate]?.[devId]?.length || 0;
        if (cupo < asigCount) {
          const devName = dbDevices.find((d: any) => String(d.id) === String(devId))?.name || devId;
          alert(`Error: "${devName}" en ${strDate} tiene ${asigCount} asignados pero cupo ${cupo}.`);
          return;
        }
      }
    }

    setIsLoading(true);
    try {
      const payload: any[] = [];
      Object.entries(calendarDb).forEach(([strDate, deviceMap]: [string, any]) => {
        const [d, mStr] = strDate.split("/");
        const fechaDB = `${year}-${mStr.padStart(2, '0')}-${d.padStart(2, '0')}`;
        const turnoId = dateTurnoMap[strDate] || 1;
        Object.entries(deviceMap).forEach(([devId, cupo]: [string, any]) => {
          payload.push({
            id_dispositivo: Number(devId),
            fecha: fechaDB,
            id_turno: turnoId,
            cupo_objetivo: cupo
          });
        });
      });

      if (payload.length > 0) {
        const { error } = await supabase.from('calendario_dispositivos')
          .upsert(payload, { onConflict: 'fecha, id_turno, id_dispositivo' });
        if (error) throw error;
        alert("Matriz de Dispositivos guardada con éxito.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setIsLoading(false);
  };

  const setAllRow = (deviceId: string, value: number) => {
    setCalendarDb((prev: any) => {
      const next = { ...prev };
      activeDates.forEach((date: string) => {
        if (!next[date]) next[date] = {};
        next[date] = { ...next[date], [deviceId]: value };
      });
      return next;
    });
  };

  return (
    <main className="flex-1 overflow-auto p-6 bg-muted/50 absolute inset-0">
      <div className="max-w-7xl mx-auto pb-20">
        {/* Header */}
        <div className="mb-6 bg-card p-6 rounded-2xl shadow-sm border border-border">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                <Settings className="w-8 h-8 text-primary" />
                Matriz de Dispositivos (Mes)
              </h2>
            </div>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2"
            >
              Guardar Cambios
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="mb-6 flex gap-4 overflow-x-auto pb-2 px-2 snap-x custom-scrollbar">
          {activeDates.map((date: string) => {
            const count = convocadosCountDb[date] || 0;
            let totalPlaces = 0;
            dbDevices.forEach((device: any) => {
              totalPlaces += calendarDb[date]?.[device.id] || 0;
            });
            let asignedTotal = 0;
            Object.values(assignmentsDb[date] || {}).forEach((arr: any) => asignedTotal += arr.length);
            const libres = count - asignedTotal;
            const huecos = totalPlaces - asignedTotal;

            return (
              <div key={date} className="min-w-[200px] snap-center p-3 bg-card border border-border shadow-sm rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <span className="bg-primary/10 text-primary text-xs px-1.5 rounded">{date}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Convocados: <span className="text-foreground">{count}</span></div>
                  <div className="text-[10px] font-bold uppercase text-primary mt-0.5 tracking-wider">Lugares: {totalPlaces}</div>
                    {(inasistenciasDb[date] || []).length > 0 && (
                      <div className="text-[10px] font-bold uppercase text-destructive mt-0.5">🚫 Inasistencias: {(inasistenciasDb[date] || []).length}</div>
                    )}
                    {(visitasByDate?.[date] || []).length > 0 && (
                      <div className="mt-0.5">
                        <VisitDetailChip visitas={visitasByDate[date]} />
                      </div>
                    )}
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {libres > 0 && <span className="score-low border px-1.5 py-0.5 rounded text-[9px] font-bold">{libres} LIBR.</span>}
                  {huecos > 0 && <span className="score-high border px-1.5 py-0.5 rounded text-[9px] font-bold">{huecos} VAC.</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Devices Table */}
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-muted p-3 border-b border-r border-border font-bold text-sm text-foreground min-w-[200px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    Dispositivo
                  </th>
                  {activeDates.map((date: string) => (
                    <th key={date} className="p-3 border-b border-r border-border font-bold text-xs text-center text-muted-foreground min-w-[80px]">
                      {date}
                    </th>
                  ))}
                  <th className="p-3 border-b border-border font-bold text-xs text-center text-muted-foreground min-w-[120px]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* ── Org Type Row — Available for all filter views ── */}
                <tr className="border-b-2 border-primary/20 bg-primary/5">
                  <td className="sticky left-0 bg-primary/5 px-4 py-3 border-r border-border font-bold text-xs text-primary z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    📋 Tipo Organización
                  </td>
                    {activeDates.map((date: string) => {
                      const orgType = tipoOrganizacionMap?.[date] || 'dispositivos fijos';
                      return (
                        <td key={date} className="px-1 py-2 border-r border-border text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            {ORG_TYPES.map(type => (
                              <button
                                key={type}
                                onClick={() => handleOrgTypeChange(date, type)}
                                className={`w-full px-1 py-0.5 text-[9px] font-bold rounded transition-all whitespace-nowrap ${
                                  orgType === type
                                    ? type === 'rotacion completa'
                                      ? 'bg-violet-100 text-violet-800 border border-violet-300'
                                      : type === 'rotacion simple'
                                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                        : 'bg-card text-foreground border border-border shadow-sm'
                                    : 'text-muted-foreground/60 hover:text-foreground border border-transparent hover:border-border'
                                }`}
                              >
                                {ORG_LABELS[type]}
                              </button>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  <td className="p-2 border-border" />
                </tr>
                {dbDevices.map((device: any) => (
                  <tr key={device.id} className="hover:bg-accent/30 transition-colors group">
                    <td className={`sticky left-0 px-4 py-3 border-b border-r border-border font-semibold text-xs z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${getFloorColor(device.name)}`}>
                      {device.name}
                    </td>
                    {activeDates.map((date: string) => {
                      const cupo = calendarDb[date]?.[device.id] ?? 0;
                      return (
                        <td key={date} className="p-2 border-b border-r border-border text-center">
                          <input
                            type="number"
                            min={0}
                            max={10}
                            className="w-14 text-center bg-muted/50 border border-border rounded-md px-1 py-1 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                            value={cupo}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setCalendarDb((prev: any) => {
                                const next = { ...prev };
                                if (!next[date]) next[date] = {};
                                next[date] = { ...next[date], [device.id]: val };
                                return next;
                              });
                            }}
                          />
                        </td>
                      );
                    })}
                    <td className="p-2 border-b border-border text-center">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => setAllRow(device.id, 1)}
                          className="bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded text-[10px] font-bold hover:bg-primary/20 transition-colors"
                        >
                          Mes (1)
                        </button>
                        <button
                          onClick={() => setAllRow(device.id, 0)}
                          className="bg-muted text-muted-foreground border border-border px-2 py-1 rounded text-[10px] font-bold hover:bg-accent transition-colors"
                        >
                          Mes (0)
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 border-t-2 border-border">
                  <td className="sticky left-0 bg-muted px-4 py-3 border-r border-border font-bold text-xs text-foreground z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    📊 Vacancia
                  </td>
                  {activeDates.map((date: string) => {
                    const convocados = convocadosCountDb[date] || 0;
                    let cuposTotales = 0;
                    let asignados = 0;
                    dbDevices.forEach((device: any) => {
                      cuposTotales += calendarDb[date]?.[device.id] || 0;
                      asignados += assignmentsDb[date]?.[device.id]?.length || 0;
                    });
                    const resVacantes = convocados - asignados;
                    const dispVacantes = cuposTotales - asignados;

                    return (
                      <td key={date} className="p-2 border-r border-border text-center bg-card align-middle">
                        <div className="flex flex-col gap-1 w-full max-w-[4rem] mx-auto">
                          <div className={`flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] font-bold border shadow-sm ${
                            resVacantes > 0 ? 'score-low' : 'score-high'
                          }`}>
                            <span>👤</span> <span>{resVacantes}</span>
                          </div>
                          <div className={`flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] font-bold border shadow-sm ${
                            dispVacantes > 0 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-muted text-muted-foreground border-border'
                          }`}>
                            <span>🧩</span> <span>{dispVacantes}</span>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-2 border-border" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
};
