import type React from 'react';

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
  numero_grupos?: number[];
  acompana_grupo?: boolean;
  _isDraft?: boolean;
}

export interface SelectedResident {
  id: number;
  name: string;
  score: number;
  device: string;
  date: string;
  numero_grupo?: number | null;
  numero_grupos?: number[];
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
  /** Tabla destino del undo. Por defecto 'menu' (apertura). */
  _table?: 'menu' | 'menu_semana';
  /** id_turno requerido para operar sobre menu_semana con precisión. */
  id_turno?: number;
}

export interface VisitaInfo {
  id_asignacion: number;
  nombre_institucion: string | null;
  cantidad_personas: number;
  rango_etario: string | null;
  estado: string;
  numero_grupo: number[] | null;
}

export type AssignmentsMatrix = Record<string, Record<string, AssignmentEntry[]>>;
export type CalendarMatrix = Record<string, Record<string, number>>;
export type ConvocadosMap = Record<string, number[]>;
export type InasistenciasMap = Record<string, InasistenciaEntry[]>;
export type VisitasByDateMap = Record<string, VisitaInfo[]>;

import { generateSchoolYearMonths } from "@/utils/dateUtils";

export const MONTHS = generateSchoolYearMonths();

export const MONTH_NAMES: Record<string, string> = {
  "Enero": "01", "Febrero": "02", "Marzo": "03", "Abril": "04",
  "Mayo": "05", "Junio": "06", "Julio": "07", "Agosto": "08",
  "Septiembre": "09", "Octubre": "10", "Noviembre": "11", "Diciembre": "12"
};

export interface AgentAnnualMetrics {
  totalAssignments: number;
  uniqueDevices: Set<string>;
  deviceReps: Record<string, number>;
}

export type AnnualMetricsMap = Record<number, AgentAnnualMetrics>;

export type MutationAction = 'insert' | 'update' | 'delete' | 'upsert';

export interface PendingMutation {
  id: string; // Unique uuid
  table: 'menu' | 'menu_semana' | 'calendario_dispositivos';
  action: MutationAction;
  payload: any;
  matchParams?: any;
  uiDate: string;
}

/**
 * Contrato del objeto `data` que `useAssignmentData` provee
 * y los componentes del módulo de asignaciones consumen.
 * Reemplaza `data: any` en todas las props de componentes de assignments.
 */
export interface AssignmentDataContext {
  // Datos base
  dbDevices: DeviceInfo[];
  allResidentsDb: ResidentInfo[];
  assignmentsDb: AssignmentsMatrix;
  setAssignmentsDb: React.Dispatch<React.SetStateAction<AssignmentsMatrix>>;
  calendarDb: CalendarMatrix;
  setCalendarDb: React.Dispatch<React.SetStateAction<CalendarMatrix>>;
  convocadosDb: ConvocadosMap;
  convocadosCountDb: Record<string, number>;
  // Estado de carga
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  refresh: () => void;
  // Turno y fechas
  turnoFilter: string;
  dateTurnoMap: Record<string, number>;
  tipoOrganizacionMap: Record<string, string>;
  // Convocatorias y asistencia
  agentConvocatoriaMap: Record<string, Record<number, number>>;
  agentConvocatoriaStatusMap: Record<string, Record<number, string>>;
  isAgentAbsent: (agentId: number, uiDate: string) => boolean;
  isAgentCanceled: (agentId: number, uiDate: string) => boolean;
  getAbsenceMotivo?: (agentId: number, uiDate: string) => string;
  // Visitas y métricas
  visitasByDate: VisitasByDateMap;
  annualMetricsDb: AnnualMetricsMap;
  aperturaMetricsDb: AnnualMetricsMap;
  tardeMananaMetricsDb: AnnualMetricsMap;
  acompanaMetricsDb: Record<number, number>;
  agentGroups: Record<string, string>;

  // Pending Drafts Mutaciones
  pendingMutations: PendingMutation[];
  addAssignmentDraft: (mutation: PendingMutation) => void;
  removeAssignmentDraft: (mutation: PendingMutation) => void;
  saveDrafts: () => Promise<{ success: boolean; error?: string }>;
  discardDrafts: () => void;
  hardRefresh: () => Promise<void>;
}
