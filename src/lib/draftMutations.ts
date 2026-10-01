import type { PendingMutation } from '@/types/assignments';

export const buildMutationKey = (m: PendingMutation) => {
  const agentId = m.matchParams?.id_agente ?? m.payload?.id_agente ?? 'na';
  const fecha = m.matchParams?.fecha_asignacion ?? m.payload?.fecha_asignacion ?? 'na';
  const turno = m.matchParams?.id_turno ?? m.payload?.id_turno ?? 'na';
  const dispositivo = m.matchParams?.id_dispositivo ?? m.payload?.id_dispositivo ?? 'na';
  const grupo = m.matchParams?.numero_grupo ?? m.payload?.numero_grupo ?? 'na';
  const includeDevice = m.table === 'menu_semana' && (
    String(m.payload?.tipo_organizacion || '').toLowerCase().includes('rotacion') ||
    (m.matchParams?.id_dispositivo != null && m.matchParams?.id_dispositivo !== 999)
  );
  return includeDevice
    ? [m.table, agentId, fecha, turno, dispositivo, grupo].join(':')
    : [m.table, agentId, fecha, turno].join(':');
};

const getMenuSemanaDeviceKey = (m: PendingMutation) => {
  if (m.table !== 'menu_semana') return null;
  const agentId = m.matchParams?.id_agente ?? m.payload?.id_agente;
  const fecha = m.matchParams?.fecha_asignacion ?? m.payload?.fecha_asignacion;
  const turno = m.matchParams?.id_turno ?? m.payload?.id_turno;
  const dispositivo = m.matchParams?.id_dispositivo ?? m.payload?.id_dispositivo;
  if (agentId == null || fecha == null || turno == null || dispositivo == null || dispositivo === 999) return null;
  return [agentId, fecha, turno, dispositivo].join(':');
};

const getMutationGroup = (m: PendingMutation) =>
  m.matchParams?.numero_grupo ?? m.payload?.numero_grupo ?? null;

const isAcompanaOnlyUpdate = (m: PendingMutation) => {
  const payloadKeys = Object.keys(m.payload || {});
  return m.action === 'update' && payloadKeys.length === 1 && payloadKeys[0] === 'acompaña_grupo';
};

const isMenuSemanaAssignmentWrite = (m: PendingMutation) =>
  m.table === 'menu_semana' &&
  m.action !== 'delete' &&
  !isAcompanaOnlyUpdate(m);

const mergeAssignmentIntoGroup = (
  assignment: PendingMutation,
  grouped: PendingMutation
): PendingMutation => {
  const group = getMutationGroup(grouped);
  return {
    ...grouped,
    action: assignment.action === 'insert' ? 'insert' : grouped.action,
    matchParams: {
      ...assignment.matchParams,
      ...grouped.matchParams,
      ...(group != null ? { numero_grupo: group } : {}),
    },
    payload: {
      ...assignment.payload,
      ...grouped.payload,
      ...(group != null ? { numero_grupo: group } : {}),
    },
  };
};

// Baja al baúl/pool (id_dispositivo 999). El caller siempre valida que sea una
// escritura de menu_semana antes de usarla.
const isBaulRemoval = (m: PendingMutation) => m.payload?.id_dispositivo === 999;

export const compactPendingMutations = (mutations: PendingMutation[]) => {
  // Escritura SIN grupo de una celda que todavía puede ser absorbida por una
  // escritura agrupada posterior (índice dentro de `compacted`).
  const pendingUngrouped = new Map<string, number>();
  // Índice de la última escritura de la celda (con grupo, sin grupo o baja):
  // impide que una escritura agrupada "retroceda" por encima de mutaciones
  // intermedias (p. ej. una baja) al absorber.
  const lastWriteIndex = new Map<string, number>();

  const compacted: PendingMutation[] = [];
  for (const mutation of mutations) {
    const key = getMenuSemanaDeviceKey(mutation);
    const isWrite = key != null && isMenuSemanaAssignmentWrite(mutation);
    const group = getMutationGroup(mutation);
    // Bajas (payload id_dispositivo 999): nunca se descartan ni se absorben;
    // se conservan en su posición para no perderlas al combinar con otras
    // acciones en la misma guardada (asignar, +G, mover, etc.).
    const isRemoval = isWrite && isBaulRemoval(mutation);

    // Escritura agrupada: absorbe la escritura sin grupo anterior de la misma
    // celda solo si no hay mutaciones intermedias (p. ej. una baja), para no
    // reordenar por encima de ellas.
    if (isWrite && !isRemoval && group != null && key != null) {
      const pendingIdx = pendingUngrouped.get(key);
      if (pendingIdx !== undefined && lastWriteIndex.get(key) === pendingIdx) {
        compacted[pendingIdx] = mergeAssignmentIntoGroup(compacted[pendingIdx], mutation);
        pendingUngrouped.delete(key);
        lastWriteIndex.set(key, pendingIdx);
        continue;
      }
    }

    compacted.push(mutation);

    if (key == null) continue;
    const idx = compacted.length - 1;
    lastWriteIndex.set(key, idx);
    if (isWrite && !isRemoval && group == null) {
      pendingUngrouped.set(key, idx);
    }
  }

  return compacted;
};
