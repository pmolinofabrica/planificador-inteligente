import { describe, expect, it, vi } from 'vitest';

const rangeCalls: Array<{ tabla: string; from: number; to: number }> = [];

function makeQuery(tabla: string) {
  const self: Record<string, unknown> = {};
  const noop = () => self;
  self.select = noop;
  self.eq = noop;
  self.gte = noop;
  self.lte = noop;
  self.order = noop;
  self.range = async (from: number, to: number) => {
    rangeCalls.push({ tabla, from, to });
    // Página 0 completa (1000 filas) y segunda vacía: obliga a fetchAllRows a
    // preguntar si hay más, que es justamente lo que ignora un `.limit(5000)`.
    const fila = { id_agente: 1, fecha_asignacion: '2026-03-01', '2do_semestre': true };
    return { data: from === 0 ? Array.from({ length: to - from + 1 }, () => fila) : [], error: null };
  };
  self.then = (res: (v: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(res);
  return self;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (tabla: string) => makeQuery(tabla) },
}));

import { fetchAcompanaRows } from './dashboard-queries';

describe('fetchAcompanaRows', () => {
  it('pagina menu y menu_semana por PK', async () => {
    rangeCalls.length = 0;
    const [menu, menuSemana] = await fetchAcompanaRows('2026-01-01', '2026-12-31');

    expect(menu).toHaveLength(1000);
    expect(menuSemana).toHaveLength(1000);

    const tablas = rangeCalls.map(c => c.tabla);
    expect(tablas).toContain('menu');
    expect(tablas).toContain('menu_semana');

    // Ambas piden la segunda página: es lo que supera el tope de 1000 filas.
    expect(rangeCalls.some(c => c.tabla === 'menu' && c.from === 1000)).toBe(true);
    expect(rangeCalls.some(c => c.tabla === 'menu_semana' && c.from === 1000)).toBe(true);
  });
});