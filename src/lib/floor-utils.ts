export const getFloorColor = (deviceName: string): string => {
  if (deviceName.includes("(P1)")) return "floor-p1 border";
  if (deviceName.includes("(P2)")) return "floor-p2 border";
  if (deviceName.includes("(P3)")) return "floor-p3 border";
  return "bg-muted text-muted-foreground border-border";
};

export const getFloorColorBadge = (deviceName: string): string => {
  if (deviceName.includes("(P1)")) return "bg-[hsl(var(--floor-1-bg))] text-[hsl(var(--floor-1-text))]";
  if (deviceName.includes("(P2)")) return "bg-[hsl(var(--floor-2-bg))] text-[hsl(var(--floor-2-text))]";
  if (deviceName.includes("(P3)")) return "bg-[hsl(var(--floor-3-bg))] text-[hsl(var(--floor-3-text))]";
  return "bg-muted text-muted-foreground";
};

export const getScoreColor = (score: number): string => {
  if (score >= 900) return "score-high border";
  if (score >= 600) return "score-mid border";
  return "score-low border";
};

/**
 * Compute rotation metrics for a resident from the assignments matrix.
 * - localReps: how many times this agent appears in a specific device across all dates
 * - uniqueDevices: how many distinct devices this agent is assigned to
 * - totalAssignments: total assignments across all dates
 * - diversityPct: uniqueDevices / totalAvailableDevices (0-100)
 */
export interface RotationMetrics {
  localReps: number;       // times in THIS device
  uniqueDevices: number;   // distinct devices covered
  totalAssignments: number;
  diversityPct: number;    // 0-100
}

import { AnnualMetricsMap } from '@/types/assignments';

export const computeRotationMetrics = (
  agentId: number,
  deviceId: string | undefined,
  totalDeviceCount: number,
  annualMetricsDb?: AnnualMetricsMap,
): RotationMetrics => {
  let localReps = 0;
  let uniqueDevices = 0;
  let totalAssignments = 0;

  if (annualMetricsDb && annualMetricsDb[agentId]) {
    const agentMetrics = annualMetricsDb[agentId];
    totalAssignments = agentMetrics.totalAssignments;
    uniqueDevices = agentMetrics.uniqueDevices.size;
    if (deviceId) {
      localReps = agentMetrics.deviceReps[deviceId] || 0;
    }
  }

  const diversityPct = totalDeviceCount > 0
    ? Math.round((uniqueDevices / totalDeviceCount) * 100)
    : 0;

  return { localReps, uniqueDevices, totalAssignments, diversityPct };
};

/** Color based on local repetitions (fewer = better rotation) */
export const getRepsColor = (localReps: number): string => {
  if (localReps <= 1) return "score-high border";  // good rotation
  if (localReps <= 2) return "score-mid border";
  return "score-low border"; // too repetitive
};

export const getFloorAccent = (piso: number | string): string => {
  const p = String(piso);
  if (p === '1') return "bg-[hsl(var(--floor-1-accent))]";
  if (p === '2') return "bg-[hsl(var(--floor-2-accent))]";
  if (p === '3') return "bg-[hsl(var(--floor-3-accent))]";
  return "bg-muted-foreground";
};

export const getFloorPisoStyle = (pisoNum: string) => {
  const styles: Record<string, { name: string; bg: string; text: string; border: string; accent: string }> = {
    '1': { name: 'PAPEL', bg: 'bg-[hsl(var(--floor-1-bg))]', text: 'text-[hsl(var(--floor-1-text))]', border: 'border-[hsl(var(--floor-1-border))]', accent: 'bg-[hsl(var(--floor-1-accent))]' },
    '2': { name: 'MADERA', bg: 'bg-[hsl(var(--floor-2-bg))]', text: 'text-[hsl(var(--floor-2-text))]', border: 'border-[hsl(var(--floor-2-border))]', accent: 'bg-[hsl(var(--floor-2-accent))]' },
    '3': { name: 'TEXTIL', bg: 'bg-[hsl(var(--floor-3-bg))]', text: 'text-[hsl(var(--floor-3-text))]', border: 'border-[hsl(var(--floor-3-border))]', accent: 'bg-[hsl(var(--floor-3-accent))]' },
  };
  return styles[pisoNum] || styles['1'];
};

export const getGroupColor = (num: number | null): string => {
  if (!num) return "bg-muted text-muted-foreground border-border";
  if (num === 1) return "bg-[hsl(var(--group-1-accent))] text-white border-[hsl(var(--group-1-accent))]";
  if (num === 2) return "bg-[hsl(var(--group-2-accent))] text-white border-[hsl(var(--group-2-accent))]";
  if (num === 3) return "bg-[hsl(var(--group-3-accent))] text-white border-[hsl(var(--group-3-accent))]";
  return "bg-primary text-primary-foreground border-primary";
};

export const getGroupUnderline = (num: number | null): string => {
  if (!num) return "";
  if (num === 1) return "border-b-2 border-[hsl(var(--group-1-accent))]";
  if (num === 2) return "border-b-2 border-[hsl(var(--group-2-accent))]";
  if (num === 3) return "border-b-2 border-[hsl(var(--group-3-accent))]";
  return "border-b-2 border-primary";
};

export const getPisoFromDeviceName = (name: string): string => {
  const match = name.match(/\(P(\d)\)/);
  return match ? match[1] : '1';
};

export const getFloorLightBg = (piso: string): string => {
  if (piso === '1' || piso === 'P1') return 'floor-p1-light';
  if (piso === '2' || piso === 'P2') return 'floor-p2-light';
  if (piso === '3' || piso === 'P3') return 'floor-p3-light';
  return 'floor-p4-light';
};

export const getPisoBadgeColor = (piso: string): string => {
  if (piso === 'P1') return 'bg-[hsl(var(--floor-1-bg))] text-[hsl(var(--floor-1-text))] border-[hsl(var(--floor-1-border))]';
  if (piso === 'P2') return 'bg-[hsl(var(--floor-2-bg))] text-[hsl(var(--floor-2-text))] border-[hsl(var(--floor-2-border))]';
  if (piso === 'P3') return 'bg-[hsl(var(--floor-3-bg))] text-[hsl(var(--floor-3-text))] border-[hsl(var(--floor-3-border))]';
  return 'bg-muted text-muted-foreground border-border';
};

export const parseUIDate = (uiDate: string, year: string): string => {
  const [d, m] = uiDate.split("/");
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

export const dbDateToUI = (dbDate: string): string => {
  const parts = dbDate.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return dbDate;
};

/**
 * Devuelve clases para indicar si un residente NO está capacitado para un dispositivo específico.
 */
export const getNotCapacitadoStyle = (
  residentCaps: Record<string, string> | undefined, 
  deviceId: string, 
  fechaActual: string
): { bg: string; text: string; border: string } | null => {
  const capDate = residentCaps ? residentCaps[deviceId] : undefined;
  const isCapacitado = !!capDate && capDate <= fechaActual;
  
  if (!isCapacitado) {
    return {
      bg: 'bg-red-50 text-red-700 border-red-300',
      text: 'text-red-700',
      border: 'border-2 border-red-400 border-dashed'
    };
  }
  return null;
};

/** Extract floor number (1, 2, 3) from a device name, or 0 if not found / P4 */
export function getDeviceFloor(deviceName: string): number {
  if (deviceName.includes('(P1)')) return 1;
  if (deviceName.includes('(P2)')) return 2;
  if (deviceName.includes('(P3)')) return 3;
  return 0;
}

/**
 * For each resident, count assignments per floor (1/2/3) and return
 * the floor with the fewest assignments. Ties resolve to lower floor.
 * Returns: Record<residentId, floorNumber>
 */
export function computeLeastFloors(
  assignmentsByDevice: Record<string, Array<{ id: number }>>,
  dbDevices: Array<{ id: string; name: string }>,
): Record<number, number> {
  const counts: Record<number, Record<number, number>> = {};
  Object.entries(assignmentsByDevice).forEach(([devId, residents]) => {
    const dev = dbDevices.find(d => String(d.id) === devId);
    if (!dev) return;
    const floor = getDeviceFloor(dev.name);
    if (floor === 0) return;
    residents.forEach(r => {
      if (!counts[r.id]) counts[r.id] = { 1: 0, 2: 0, 3: 0 };
      counts[r.id][floor]++;
    });
  });
  const result: Record<number, number> = {};
  Object.entries(counts).forEach(([idStr, floorCounts]) => {
    let minFloor = 1;
    let minCount = floorCounts[1];
    if (floorCounts[2] < minCount) { minCount = floorCounts[2]; minFloor = 2; }
    if (floorCounts[3] < minCount) { minFloor = 3; }
    result[Number(idStr)] = minFloor;
  });
  return result;
}

/** Returns Tailwind class for the accent color of a floor (for text/border) */
export function getFloorTextClass(floor: number): string {
  if (floor === 1) return 'text-[hsl(var(--floor-1-accent))] border-b-2 border-[hsl(var(--floor-1-accent))]';
  if (floor === 2) return 'text-[hsl(var(--floor-2-accent))] border-b-2 border-[hsl(var(--floor-2-accent))]';
  if (floor === 3) return 'text-[hsl(var(--floor-3-accent))] border-b-2 border-[hsl(var(--floor-3-accent))]';
  return '';
}
