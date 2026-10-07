import { describe, expect, it, vi, beforeEach } from 'vitest';

/** Filas simuladas por tabla, indexadas por la columna usada en el `.in()`. */
let fakeData: Record<string, Array<Record<string, unknown>>> = {};

/** Registro de cada consulta para poder verificar filtros y columnas. */
let consultas: Array<{ tabla: string; columnas: string; filtros: string[]; inIds: number[] | null }> = [];

/**
 * Mock de PostgREST. `.in()` se simula filtrando por `__match`, que marca a qué
 * columna-id se compara cada fila.
 */
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (tabla: string) => {
      const state: { columnas: string; filtros: string[]; inIds: number[] | null } = {
        columnas: '',
        filtros: [],
        inIds: null,
      };

      const self: Record<string, unknown> = {};
      self.select = (cols: string) => { state.columnas = cols; return self; };
      self.gte = (col: string, v: unknown) => { state.filtros.push(`gte:${col}:${v}`); return self; };
      self.lte = (col: string, v: unknown) => { state.filtros.push(`lte:${col}:${v}`); return self; };
      self.in = (col: string, vals: readonly unknown[]) => {
        state.filtros.push(`in:${col}`);
        state.inIds = vals as number[];
        return self;
      };
      self.order = () => self;
      self.range = async () => {
        consultas.push({ tabla, columnas: state.columnas, filtros: [...state.filtros], inIds: state.inIds });
        let rows = fakeData[tabla] ?? [];
        if (state.inIds) {
          rows = rows.filter(r => state.inIds!.includes(r.__match as number));
        }
        return { data: rows, error: null };
      };
      return self;
    },
  },
}));

// fetchAllRows real: solo se aísla la paginación para no depender de volumen.
vi.mock('@/lib/supabase-pagination', () => ({
  fetchAllRows: async (build: () => { range: (f: number, t: number) => Promise<{ data: unknown[] }> }) => {
    const { data } = await build().range(0, 999);
    return (data ?? []) as never[];
  },
  PAGE_SIZE: 1000,
}));

import { fetchYearScopedData } from './year-scoped-data';

const consulta = (tabla: string) => consultas.find(c => c.tabla === tabla);

beforeEach(() => {
  consultas = [];
  fakeData = {};
});

describe('fetchYearScopedData', () => {
  it('pide los días del año por rango de fechas', async () => {
    fakeData = {
      dias: [{ id_dia: 1, fecha: '2026-02-15', __match: 1 }],
      capacitaciones: [], capacitaciones_participantes: [],
      capacitaciones_dispositivos: [], planificacion: [],
    };

    await fetchYearScopedData(2026);

    expect(consulta('dias')?.filtros).toEqual([
      'gte:fecha:2026-01-01',
      'lte:fecha:2026-12-31',
    ]);
  });

  it('cascada: capacitaciones solo de los días del año', async () => {
    fakeData = {
      dias: [
        { id_dia: 10, fecha: '2026-02-15', __match: 10 },
        { id_dia: 11, fecha: '2026-03-01', __match: 11 },
      ],
      capacitaciones: [
        { id_cap: 100, id_dia: 10, id_turno: 1, grupo: null, __match: 10 },
        { id_cap: 101, id_dia: 11, id_turno: 1, grupo: null, __match: 11 },
        // De 2025: NO debe aparecer.
        { id_cap: 999, id_dia: 77, id_turno: 1, grupo: null, __match: 77 },
      ],
      capacitaciones_participantes: [], capacitaciones_dispositivos: [], planificacion: [],
    };

    const r = await fetchYearScopedData(2026);

    expect(r.dias).toHaveLength(2);
    expect(r.caps.map(c => c.id_cap)).toEqual([100, 101]);
    expect(consulta('capacitaciones')?.inIds).toEqual([10, 11]);
  });

  it('cascada: participantes solo de las capacitaciones del año', async () => {
    fakeData = {
      dias: [{ id_dia: 10, fecha: '2026-02-15', __match: 10 }],
      capacitaciones: [
        { id_cap: 100, id_dia: 10, id_turno: 1, grupo: null, __match: 10 },
      ],
      capacitaciones_participantes: [
        { id_participante: 1, id_cap: 100, id_agente: 5, asistio: true, __match: 100 },
        // Capacitación de 2025: NO debe aparecer.
        { id_participante: 2, id_cap: 999, id_agente: 7, asistio: true, __match: 999 },
      ],
      capacitaciones_dispositivos: [], planificacion: [],
    };

    const r = await fetchYearScopedData(2026);

    expect(r.parts.map(p => p.id_agente)).toEqual([5]);
    expect(consulta('capacitaciones_participantes')?.inIds).toEqual([100]);
  });

  it('cascada: dispositivos solo de las capacitaciones del año', async () => {
    fakeData = {
      dias: [{ id_dia: 10, fecha: '2026-02-15', __match: 10 }],
      capacitaciones: [{ id_cap: 100, id_dia: 10, id_turno: 1, grupo: null, __match: 10 }],
      capacitaciones_participantes: [],
      capacitaciones_dispositivos: [
        { id_cap_dispo: 1, id_cap: 100, id_dispositivo: 3, __match: 100 },
        { id_cap_dispo: 2, id_cap: 999, id_dispositivo: 4, __match: 999 },
      ],
      planificacion: [],
    };

    const r = await fetchYearScopedData(2026);

    expect(r.dispos.map(d => d.id_dispositivo)).toEqual([3]);
  });

  it('planificacion solo de los días del año', async () => {
    fakeData = {
      dias: [{ id_dia: 10, fecha: '2026-02-15', __match: 10 }],
      capacitaciones: [], capacitaciones_participantes: [], capacitaciones_dispositivos: [],
      planificacion: [
        { id_plani: 500, id_dia: 10, id_turno: 1, grupo: null, __match: 10 },
        { id_plani: 501, id_dia: 88, id_turno: 1, grupo: null, __match: 88 },
      ],
    };

    const r = await fetchYearScopedData(2026);

    expect(r.planis.map(p => p.id_plani)).toEqual([500]);
  });

  it('no consulta nada más si el año no tiene días cargados', async () => {
    fakeData = {
      dias: [],
      // Si se consultara, estas filas se colarían.
      capacitaciones: [{ id_cap: 1, id_dia: 1, id_turno: 1, grupo: null, __match: 1 }],
      capacitaciones_participantes: [], capacitaciones_dispositivos: [], planificacion: [],
    };

    const r = await fetchYearScopedData(2099);

    expect(r.dias).toEqual([]);
    expect(r.caps).toEqual([]);
    expect(r.parts).toEqual([]);
    expect(r.dispos).toEqual([]);
    expect(r.planis).toEqual([]);
    expect(consulta('capacitaciones')).toBeUndefined();
  });
});