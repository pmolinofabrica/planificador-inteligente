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

export const compactPendingMutations = (mutations: PendingMutation[]) => {
  const ungroupedAssignments = new Map<string, PendingMutation>();
  const groupedKeys = new Set<string>();

  for (const mutation of mutations) {
    const key = getMenuSemanaDeviceKey(mutation);
    const group = getMutationGroup(mutation);
    if (!key || !isMenuSemanaAssignmentWrite(mutation)) continue;
    if (group == null) {
      ungroupedAssignments.set(key, mutation);
    } else {
      groupedKeys.add(key);
    }
  }

  const compacted: PendingMutation[] = [];
  for (const mutation of mutations) {
    const key = getMenuSemanaDeviceKey(mutation);
    const group = getMutationGroup(mutation);

    if (key && isMenuSemanaAssignmentWrite(mutation) && group == null && groupedKeys.has(key)) {
      continue;
    }

    if (key && isMenuSemanaAssignmentWrite(mutation) && group != null) {
      const assignment = ungroupedAssignments.get(key);
      compacted.push(assignment ? mergeAssignmentIntoGroup(assignment, mutation) : mutation);
      continue;
    }

    compacted.push(mutation);
  }

  return compacted;
};
