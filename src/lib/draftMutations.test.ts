import { describe, expect, it } from 'vitest';
import { buildMutationKey, compactPendingMutations } from './draftMutations';
import type { PendingMutation } from '@/types/assignments';

const baseAssignment: PendingMutation = {
  id: 'assign-1',
  table: 'menu_semana',
  action: 'upsert',
  matchParams: {
    id_agente: 1,
    fecha_asignacion: '2026-06-10',
    id_turno: 4,
    id_dispositivo: 7,
  },
  payload: {
    id_agente: 1,
    fecha_asignacion: '2026-06-10',
    id_turno: 4,
    id_dispositivo: 7,
    id_convocatoria: 99,
    estado_ejecucion: 'planificado',
    tipo_organizacion: 'rotacion completa',
    _ui_name: 'Residente Uno',
  },
  uiDate: '10/06',
};

describe('draft mutations', () => {
  it('consolidates an ungrouped assignment into a grouped assignment', () => {
    const grouped: PendingMutation = {
      id: 'group-1',
      table: 'menu_semana',
      action: 'upsert',
      matchParams: {
        id_agente: 1,
        fecha_asignacion: '2026-06-10',
        id_turno: 4,
        id_dispositivo: 7,
        numero_grupo: 2,
      },
      payload: {
        id_agente: 1,
        fecha_asignacion: '2026-06-10',
        id_turno: 4,
        id_dispositivo: 7,
        numero_grupo: 2,
        tipo_organizacion: 'rotacion completa',
      },
      uiDate: '10/06',
    };

    const compacted = compactPendingMutations([baseAssignment, grouped]);

    expect(compacted).toHaveLength(1);
    expect(compacted[0]).toMatchObject({
      id: 'group-1',
      matchParams: { numero_grupo: 2 },
      payload: {
        id_convocatoria: 99,
        estado_ejecucion: 'planificado',
        numero_grupo: 2,
      },
    });
  });

  it('keeps multiple physical groups and removes only the ungrouped placeholder', () => {
    const groupOne = {
      ...baseAssignment,
      id: 'group-1',
      matchParams: { ...baseAssignment.matchParams, numero_grupo: 1 },
      payload: { ...baseAssignment.payload, numero_grupo: 1 },
    };
    const groupTwo = {
      ...baseAssignment,
      id: 'group-2',
      matchParams: { ...baseAssignment.matchParams, numero_grupo: 2 },
      payload: { ...baseAssignment.payload, numero_grupo: 2 },
    };

    const compacted = compactPendingMutations([baseAssignment, groupOne, groupTwo]);

    expect(compacted.map((m) => m.payload.numero_grupo)).toEqual([1, 2]);
  });

  it('does not compact partial acompana updates into group writes', () => {
    const grouped = {
      ...baseAssignment,
      id: 'group-1',
      matchParams: { ...baseAssignment.matchParams, numero_grupo: 1 },
      payload: { ...baseAssignment.payload, numero_grupo: 1 },
    };
    const acompana: PendingMutation = {
      id: 'acompanar-1',
      table: 'menu_semana',
      action: 'update',
      matchParams: baseAssignment.matchParams,
      payload: { 'acompaña_grupo': true },
      uiDate: '10/06',
    };

    const compacted = compactPendingMutations([baseAssignment, grouped, acompana]);

    expect(compacted).toHaveLength(2);
    expect(compacted[0].id).toBe('group-1');
    expect(compacted[1]).toBe(acompana);
  });

  it('uses group in the mutation key when the row is physical', () => {
    expect(buildMutationKey({
      ...baseAssignment,
      matchParams: { ...baseAssignment.matchParams, numero_grupo: 3 },
      payload: { ...baseAssignment.payload, numero_grupo: 3 },
    })).toBe('menu_semana:1:2026-06-10:4:7:3');
  });
});
