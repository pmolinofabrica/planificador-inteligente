export type ActiveTab = 'plan' | 'menu' | 'exec' | 'devices';

export interface DeviceInfo {
  id: string;
  name: string;
  min: number;
  max: number;
  piso: number;
}

export interface ResidentInfo {
  id: number;
  name: string;
  caps: Record<string, string>; // deviceId -> capacitation date
}

export interface AssignmentEntry {
  id: number;
  name: string;
  score: number;
  numero_grupo?: number | null;
}

export interface SelectedResident {
  id: number;
  name: string;
  score: number;
  device: string;
  date: string;
}

export interface SelectedDevice {
  id: string;
  name: string;
}

export interface SelectedVacant {
  id: number;
  name: string;
  date: string;
}

export interface InasistenciaEntry {
  id_agente: number;
  motivo: string;
}

export interface UndoEntry {
  snapshot?: UndoSnapshot;
  snapshots?: UndoSnapshot[];
  _timestamp: string;
}

export interface UndoSnapshot {
  id_agente: number;
  fecha_asignacion: string;
  id_dispositivo: number;
  estado_ejecucion?: string;
  _isInsert?: boolean;
}

export type AssignmentsMatrix = Record<string, Record<string, AssignmentEntry[]>>;
export type CalendarMatrix = Record<string, Record<string, number>>;
export type ConvocadosMap = Record<string, number[]>;
export type InasistenciasMap = Record<string, InasistenciaEntry[]>;

export const MONTHS = ["Febrero 2026", "Marzo 2026", "Abril 2026"];

export const MONTH_NAMES: Record<string, string> = {
  "Enero": "01", "Febrero": "02", "Marzo": "03", "Abril": "04",
  "Mayo": "05", "Junio": "06", "Julio": "07", "Agosto": "08",
  "Septiembre": "09", "Octubre": "10", "Noviembre": "11", "Diciembre": "12"
};
