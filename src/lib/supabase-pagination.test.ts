import { describe, expect, it, vi } from 'vitest';
import { fetchAllRows, PAGE_SIZE } from './supabase-pagination';

/**
 * Simula PostgREST: corta cada respuesta en 1000 filas (config `max-rows`),
 * ignorando cualquier `.limit()` mayor, y solo devuelve filas si hay orden.
 */
type Row = { id: number };

function createBuilder(
  rows: Row[],
  calls: { ranges: Array<[number, number]>; orders: string[] },
  opts: { maxRows?: number; errorOnPage?: number } = {},
) {
  const maxRows = opts.maxRows ?? PAGE_SIZE;

  return () => {
    const self = {
      order(column: string) {
        calls.orders.push(column);
        return self;
      },
      async range(from: number, to: number) {
        calls.ranges.push([from, to]);
        if (opts.errorOnPage === calls.ranges.length) {
          return { data: null, error: { message: 'boom' } };
        }
        const ordered = [...rows].sort((a, b) => a.id - b.id);
        const width = Math.min(to - from + 1, maxRows);
        return { data: ordered.slice(from, from + width), error: null };
      },
    };
    return self;
  };
}

const makeRows = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

describe('fetchAllRows', () => {
  it('devuelve todas las filas cuando la tabla cabe en una página', async () => {
    const calls = { ranges: [] as Array<[number, number]>, orders: [] as string[] };
    const rows = await fetchAllRows(createBuilder(makeRows(42), calls), { orderColumn: 'id' });

    expect(rows).toHaveLength(42);
    expect(calls.ranges).toEqual([[0, PAGE_SIZE - 1]]);
  });

  it('pide una página extra cuando la última viene exactamente completa', async () => {
    // Con exactamente PAGE_SIZE filas no se puede saber si hay más sin
    // preguntar: debereachable la segunda página en vez de cortar en 1000.
    const calls = { ranges: [] as Array<[number, number]>, orders: [] as string[] };
    const rows = await fetchAllRows(createBuilder(makeRows(PAGE_SIZE), calls), { orderColumn: 'id' });

    expect(rows).toHaveLength(PAGE_SIZE);
    expect(calls.ranges).toEqual([
      [0, PAGE_SIZE - 1],
      [PAGE_SIZE, PAGE_SIZE * 2 - 1],
    ]);
  });

  it('recorre todas las páginas de una tabla que supera el tope de 1000', async () => {
    const calls = { ranges: [] as Array<[number, number]>, orders: [] as string[] };
    const rows = await fetchAllRows(createBuilder(makeRows(1708), calls), { orderColumn: 'id_menu' });

    expect(rows).toHaveLength(1708);
    expect(calls.ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('no pierde ni duplica filas al paginar un volumen grande', async () => {
    // Regresión del bug original: sin orden estable, el offset puede saltar filas.
    const calls = { ranges: [] as Array<[number, number]>, orders: [] as string[] };
    const rows = await fetchAllRows(createBuilder(makeRows(5892), calls), { orderColumn: 'id_convocatoria' });

    expect(rows).toHaveLength(5892);
    expect(new Set(rows.map(r => r.id)).size).toBe(5892);
  });

  it('aplica el orden por la columna indicada en cada página', async () => {
    const calls = { ranges: [] as Array<[number, number]>, orders: [] as string[] };
    await fetchAllRows(createBuilder(makeRows(2500), calls), { orderColumn: 'id_menu_semana' });

    expect(calls.orders).toEqual(['id_menu_semana', 'id_menu_semana', 'id_menu_semana']);
  });

  it('respeta el tamaño de página configurado', async () => {
    const calls = { ranges: [] as Array<[number, number]>, orders: [] as string[] };
    const rows = await fetchAllRows(createBuilder(makeRows(250), calls), {
      orderColumn: 'id',
      pageSize: 100,
    });

    expect(rows).toHaveLength(250);
    expect(calls.ranges).toEqual([[0, 99], [100, 199], [200, 299]]);
  });

  it('propaga el error de Supabase en vez de devolver datos parciales', async () => {
    const calls = { ranges: [] as Array<[number, number]>, orders: [] as string[] };
    const build = createBuilder(makeRows(2500), calls, { errorOnPage: 2 });

    await expect(fetchAllRows(build, { orderColumn: 'id' })).rejects.toThrow('boom');
  });

  it('devuelve vacío sin lanzar cuando la tabla no tiene filas', async () => {
    const calls = { ranges: [] as Array<[number, number]>, orders: [] as string[] };
    const rows = await fetchAllRows(createBuilder([], calls), { orderColumn: 'id' });

    expect(rows).toEqual([]);
    expect(calls.ranges).toEqual([[0, PAGE_SIZE - 1]]);
  });

  it('crea un builder limpio por página', async () => {
    // Si se reusara el mismo builder, el segundo .range() acumularía el
    // offset anterior y la paginación se descuadraría.
    const build = vi.fn(() => createBuilder(makeRows(1500), { ranges: [], orders: [] })());

    await fetchAllRows<Row>(build, { orderColumn: 'id' });

    expect(build).toHaveBeenCalledTimes(2);
  });
});