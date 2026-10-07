import { describe, expect, it, vi, beforeEach } from 'vitest';

/** Respuestas simulables de la tabla config_cohorte. */
type CohorteRows = Array<{ anio: number }>;

let mockRows: CohorteRows = [];
let mockError: { message: string } | null = null;
let calls = 0;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (tabla: string) => {
      if (tabla !== 'config_cohorte') throw new Error('tabla inesperada: ' + tabla);
      return {
        select: () => ({
          eq: async () => {
            calls++;
            if (mockError) return { data: null, error: mockError };
            return { data: mockRows, error: null };
          },
        }),
      };
    },
  },
}));

import {
  getActiveCohorte,
  getActiveCohorteSync,
  invalidateCohorteCache,
  preloadActiveCohorte,
} from './useConfig';

beforeEach(() => {
  mockRows = [];
  mockError = null;
  calls = 0;
  invalidateCohorteCache();
});

describe('getActiveCohorte', () => {
  it('devuelve el año con activo = true en config_cohorte', async () => {
    mockRows = [{ anio: 2027 }];
    await expect(getActiveCohorte()).resolves.toBe(2027);
  });

  it('no usa el reloj: con config_cohorte en 2027 devuelve 2027 aunque el año real sea otro', async () => {
    // Este es el punto del cambio: la cohorte es un dato de configuración,
    // no una consecuencia de la fecha del sistema.
    mockRows = [{ anio: 2027 }];
    const real = new Date().getFullYear();
    const resultado = await getActiveCohorte();

    expect(resultado).toBe(2027);
    expect(resultado).not.toBe(real);
  });

  it('toma la más alta si por error hay varias activas', async () => {
    mockRows = [{ anio: 2025 }, { anio: 2026 }, { anio: 2027 }];
    await expect(getActiveCohorte()).resolves.toBe(2027);
  });

  it('cae al año del reloj si no hay ninguna activa', async () => {
    mockRows = [];
    await expect(getActiveCohorte()).resolves.toBe(new Date().getFullYear());
  });

  it('cae al año del reloj si la consulta falla', async () => {
    mockError = { message: 'permission denied' };
    await expect(getActiveCohorte()).resolves.toBe(new Date().getFullYear());
  });

  it('cae al año del reloj si config_cohorte devuelve null', async () => {
    mockRows = null as unknown as CohorteRows;
    await expect(getActiveCohorte()).resolves.toBe(new Date().getFullYear());
  });
});

describe('caché de cohorte', () => {
  it('preloadActiveCohorte consulta una sola vez mientras no se invalide', async () => {
    mockRows = [{ anio: 2027 }];

    await preloadActiveCohorte();
    await preloadActiveCohorte();
    await preloadActiveCohorte();

    expect(calls).toBe(1);
  });

  it('reutiliza la promesa en vuelo en lugar de disparar dos consultas', async () => {
    mockRows = [{ anio: 2027 }];

    await Promise.all([preloadActiveCohorte(), preloadActiveCohorte()]);

    expect(calls).toBe(1);
  });

  it('vuelve a consultar después de invalidateCohorteCache', async () => {
    mockRows = [{ anio: 2027 }];
    await preloadActiveCohorte();
    expect(calls).toBe(1);

    // Simula la rotación de cohorte: la base ahora declara 2028.
    mockRows = [{ anio: 2028 }];
    invalidateCohorteCache();

    await expect(preloadActiveCohorte()).resolves.toBe(2028);
    expect(calls).toBe(2);
  });

  it('getActiveCohorteSync sirve el valor cacheado y antes de cargar usa el reloj', async () => {
    mockRows = [{ anio: 2027 }];

    // Sin preload: todavía no se sabe la cohorte real.
    expect(getActiveCohorteSync()).toBe(new Date().getFullYear());

    await preloadActiveCohorte();
    expect(getActiveCohorteSync()).toBe(2027);
  });
});