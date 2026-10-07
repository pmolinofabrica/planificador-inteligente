import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guardas contra regresiones de truncamiento silencioso, ya verificadas en la
 * base real:
 *
 * - `capacitaciones_participantes` tiene 1048 filas y usaba `.limit(5000)`, que
 *   aparenta traer todo pero PostgREST corta en 1000: se perdían 48 asistencias
 *   sin error visible.
 * - Con varios años cargados sobre la misma base, las capacitaciones de un año
 *   se cruzaban con los agentes de otro en `buildResidentCaps`.
 *
 * El comportamiento de la paginación está cubierto en `supabase-pagination.test.ts`
 * y la cascada por año en `year-scoped-data.test.ts`. Acá se verifica el cableado:
 * que el hook use el helper y que los filtros de año existan en el servidor.
 */

const hook = readFileSync(resolve(__dirname, './useAssignmentData.ts'), 'utf8');
const loader = readFileSync(resolve(__dirname, '../lib/year-scoped-data.ts'), 'utf8');

describe('useAssignmentData - consultas que pueden superar 1000 filas', () => {
  it('no usa .limit() con un valor mayor a 1000', () => {
    const offenders = hook
      .split(/\r?\n/)
      .map((text, i) => ({ linea: i + 1, text }))
      // `[^\r\n]` en vez de `.*` porque el archivo tiene finales CRLF y `.`
      // no cruza el `\r`, dejando el comentario "vivo" para la regexp.
      .filter(({ text }) => /\.limit\(\s*[2-9]\d{3}/.test(text.replace(/\/\/[^\r\n]*/g, '')));

    expect(offenders).toEqual([]);
  });

  it('carga capacitaciones y planificación por año, no la tabla entera', () => {
    expect(hook).toContain('fetchYearScopedData');
    // Si el hook volviera a leer las tablas sin acotar, el filtro por año
    // desaparecería junto con la protección entre cohortes.
    expect(hook).not.toMatch(/from\('capacitaciones_participantes'\)\.select\('id_cap, id_agente, asistio'\)/);
    expect(hook).not.toMatch(/from\('planificacion'\)\.select\('id_plani, id_dia, id_turno, grupo'\)/);
  });
});

describe('year-scoped-data - filtro por año en servidor', () => {
  it('pide los días por rango de fechas del año', () => {
    expect(loader).toMatch(/gte\('fecha', yearStart\)\.lte\('fecha', yearEnd\)/);
  });

  it('acota cada tabla por los ids de su nivel anterior', () => {
    // La cascada dias -> capacitaciones -> participantes/dispositivos es lo que
    // impide que las capacitaciones de 2026 entren en el conteo de 2027.
    expect(loader).toContain("fetchByIds<CapsRow>('capacitaciones', 'id_dia', diasIds");
    expect(loader).toContain("fetchByIds<PartRow>('capacitaciones_participantes', 'id_cap', capIds");
    expect(loader).toContain("fetchByIds<DispoRow>('capacitaciones_dispositivos', 'id_cap', capIds");
    expect(loader).toContain("fetchByIds<PlaniRow>('planificacion', 'id_dia', diasIds");
  });

  it('pagina ordenando por PK en todas las tablas de la cascada', () => {
    for (const pk of ['id_dia', 'id_cap', 'id_participante', 'id_cap_dispo', 'id_plani']) {
      expect(loader).toContain(`'${pk}'`);
    }
  });

  it('devuelve vacío sin consultar si el año no tiene días', () => {
    // Sin el corte temprano, un `.in()` con lista vacía igual dispararía la
    // consulta contra la base.
    expect(loader).toContain('if (ids.length === 0) return [];');
  });
});