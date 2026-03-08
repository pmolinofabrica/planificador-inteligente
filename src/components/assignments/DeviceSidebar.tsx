import React from 'react';
import { Monitor, Check, AlertCircle } from 'lucide-react';
import { getFloorColor } from '@/lib/floor-utils';
import type { SelectedDevice } from '@/types/assignments';

interface DeviceSidebarProps {
  selectedDevice: SelectedDevice;
  setSelectedDevice: (d: SelectedDevice | null) => void;
  data: any;
  year: string;
}

export const DeviceSidebar: React.FC<DeviceSidebarProps> = ({
  selectedDevice, setSelectedDevice, data, year,
}) => {
  const { allResidentsDb, dbDevices } = data;
  const deviceId = selectedDevice.id;

  const capacitados: { id: number; name: string; capDate: string }[] = [];
  const noCapacitados: { id: number; name: string }[] = [];

  allResidentsDb.forEach((res: any) => {
    const capDate = res.caps[deviceId];
    if (capDate) {
      capacitados.push({ id: res.id, name: res.name, capDate });
    } else {
      noCapacitados.push({ id: res.id, name: res.name });
    }
  });

  capacitados.sort((a, b) => a.capDate.localeCompare(b.capDate));
  noCapacitados.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="w-96 bg-card border-l border-border shadow-2xl flex flex-col absolute right-0 h-full z-50 overflow-hidden">
      <div className={`p-6 border-b ${getFloorColor(selectedDevice.name)}`}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase mb-1 block opacity-80">
              <Monitor className="w-3 h-3 inline mr-1" />Dispositivo
            </span>
            <h3 className="text-xl font-bold">{selectedDevice.name}</h3>
          </div>
          <button onClick={() => setSelectedDevice(null)} className="opacity-70 hover:opacity-100 bg-card/20 p-1.5 rounded-md border border-border/30">✕</button>
        </div>
        <p className="text-xs opacity-70 font-medium">Residentes por estado de capacitación</p>
      </div>
      <div className="p-5 flex-1 overflow-y-auto bg-card space-y-5">
        <div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Check className="w-3 h-3" /> Capacitados ({capacitados.length})
          </span>
          {capacitados.length === 0 ? (
            <div className="text-xs text-muted-foreground italic p-2">Ninguno capacitado aún.</div>
          ) : (
            <div className="space-y-1">
              {capacitados.map(r => (
                <div key={r.id} className="p-2 rounded-lg border border-emerald-200 bg-emerald-50 flex justify-between items-center">
                  <span className="font-bold text-xs text-emerald-900">{r.name}</span>
                  <span className="text-[9px] font-mono text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                    {r.capDate}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> No Capacitados ({noCapacitados.length})
          </span>
          {noCapacitados.length === 0 ? (
            <div className="text-xs text-muted-foreground italic p-2">Todos capacitados.</div>
          ) : (
            <div className="space-y-1">
              {noCapacitados.map(r => (
                <div key={r.id} className="p-2 rounded-lg border border-border bg-muted/30">
                  <span className="font-medium text-xs text-muted-foreground">{r.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
