export const TABLERO_USERS = ['Pablo', 'Vane', 'Celi', 'Euge', 'Eli'] as const;
export type TableroUser = typeof TABLERO_USERS[number];

export type TableroTipo = 'fallo' | 'mensaje' | 'propuesta';
export type TableroEstado = 'pendiente' | 'en_progreso' | 'feedback' | 'resuelto' | 'cerrado';

/** Apps que comparten el tablero */
export const TABLERO_APPS = ['asignaciones', 'planificacion', 'visit'] as const;
export type TableroApp = typeof TABLERO_APPS[number];

export interface TableroItem {
  id: number;
  titulo: string;
  descripcion: string;
  tipo: TableroTipo;
  estado: TableroEstado;
  autor_nombre: TableroUser;
  app: TableroApp;
  created_at: string;
  updated_at: string;
}

export interface TableroComentario {
  id: number;
  item_id: number;
  autor_nombre: TableroUser;
  contenido: string;
  created_at: string;
}

export const TIPO_CONFIG: Record<TableroTipo, { label: string; badge: string; border: string; icon: string }> = {
  fallo: {
    label: 'Fallo',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    border: 'border-l-4 border-red-400',
    icon: '🐛',
  },
  mensaje: {
    label: 'Mensaje',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    border: 'border-l-4 border-blue-400',
    icon: '💬',
  },
  propuesta: {
    label: 'Propuesta',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    border: 'border-l-4 border-green-400',
    icon: '💡',
  },
};

export const ESTADO_LABELS: Record<TableroEstado, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En Progreso',
  feedback: 'Feedback',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
};

export const ESTADO_SHORT: Record<TableroEstado, string> = {
  pendiente: 'Pend.',
  en_progreso: 'Progreso',
  feedback: 'Feedback',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
};

export const ESTADO_COLUMNS: { estado: TableroEstado; label: string; shortLabel: string; color: string; icon: string; headerBg: string }[] = [
  { estado: 'pendiente', label: 'Pendiente', shortLabel: 'Pend.', color: 'bg-gray-100 dark:bg-gray-800/50', icon: 'Inbox', headerBg: 'bg-gray-200/50 dark:bg-gray-700/30' },
  { estado: 'en_progreso', label: 'En Progreso', shortLabel: 'Progreso', color: 'bg-yellow-50 dark:bg-yellow-900/20', icon: 'PlayCircle', headerBg: 'bg-yellow-200/50 dark:bg-yellow-800/30' },
  { estado: 'feedback', label: 'Feedback', shortLabel: 'Feedback', color: 'bg-purple-50 dark:bg-purple-900/20', icon: 'MessageCircle', headerBg: 'bg-purple-200/50 dark:bg-purple-800/30' },
  { estado: 'resuelto', label: 'Resuelto', shortLabel: 'Resuelto', color: 'bg-green-50 dark:bg-green-900/20', icon: 'CheckCircle2', headerBg: 'bg-green-200/50 dark:bg-green-800/30' },
  { estado: 'cerrado', label: 'Cerrado', shortLabel: 'Cerrado', color: 'bg-gray-50 dark:bg-gray-900/20', icon: 'Archive', headerBg: 'bg-gray-300/50 dark:bg-gray-600/30' },
];

export const STORAGE_USER_KEY = 'tablero_user';
