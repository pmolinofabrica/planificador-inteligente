import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guarda contra una regresión concreta ya verificada en producción:
 * `capacitaciones_participantes` tiene 1048 filas y la consulta usaba
 * `.limit(5000)`, que parece traer todo pero PostgREST corta en 1000
 * (config `max-rows`). Se perdían 48 asistencias sin ningún error visible.
 *
 * Se comprueba sobre el fuente porque montar `useAssignmentData` arrastra todo
 * el árbol de datos del planificador; el comportamiento real de la paginación
 * está cubierto en `supabase-pagination.test.ts`.
 */
describe('useAssignmentData - consultas que pueden superar 1000 filas', () => {
  const source = readFileSync(resolve(__dirname, './useAssignmentData.ts'), 'utf8');

  it('no usa .limit() con un valor mayor a 1000', () => {
    const offenders = source
      .split('\n')
      .map((text, i) => ({ linea: i + 1, text }))
      // Se ignoran comentarios: la explicación del bug menciona `.limit(5000)`.
      // `[^\r\n]` en vez de `.*` porque el archivo tiene finales CRLF y `.`
      // no cruza el `\r`, dejando el comentario "vivo" para la regexp.
      .filter(({ text }) => /\.limit\(\s*[2-9]\d{3}/.test(text.replace(/\/\/[^\r\n]*/g, '')));

    expect(offenders).toEqual([]);
  });

  it('pagina capacitaciones_participantes ordenando por su PK', () => {
    expect(source).toMatch(
      /fetchAllRows[\s\S]{0,240}capacitaciones_participantes[\s\S]{0,240}orderColumn: 'id_participante'/,
    );
  });

  it('pagina el resto de tablas indexadas por PK', () => {
    for (const pk of ['id_cap_dispo', 'id_plani', 'id_inasistencia']) {
      expect(source).toContain(`orderColumn: '${pk}'`);
    }
  });
});