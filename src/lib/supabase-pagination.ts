/**
 * PostgREST (Supabase) corta toda respuesta en 1000 filas (config `max-rows`).
 * Un `.limit(5000)` NO evade ese tope: la petición sigue volviendo truncada a 1000.
 * Para leer el universo completo hay que paginar con `.range()`.
 *
 * La paginación por offset solo es confiable si el resultado tiene orden estable:
 * sin un `ORDER BY`, Postgres puede devolver las filas en un orden distinto en cada
 * petición y el solapamiento entre páginas saltea o duplica registros. Por eso
 * `fetchAllRows` exige una columna de orden (típicamente la PK) y la aplica siempre.
 */

export const PAGE_SIZE = 1000;

/**
 * Builder mínimo de PostgREST que necesita este helper.
 * `range()` devuelve el propio builder (que es thenable y además tiene
 * `data`/`error` como promesas), no un `Promise` plano: por eso el tipo usa
 * `PromiseLike` en vez de `Promise`.
 */
export type QueryBuilder = {
  order: (column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) => QueryBuilder;
  // `data` es `unknown` a propósito: los tipos generados de Supabase están
  // desactualizados y cuando una columna no está declarada (p. ej.
  // `2do_semestre`) el select resuelve a un tipo de error que no encaja en
  // `Record<string, unknown>`.
  range: (from: number, to: number) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

/**
 * Lee todas las filas de una consulta paginando con `.range()`.
 *
 * @param build   Callback que crea el builder. Se invoca una vez por página para
 *                partir siempre de un builder limpio con los filtros aplicados.
 * @param options.orderColumn  Columna por la que ordenar (PK recomendada). Es
 *                obligatoria en la práctica: sin ella la paginación no es
 *                determinista. Si se omite, se pagina igual pero el resultado
 *                puede tener huecos o repetidos.
 * @param options.ascending   Sentido del orden (por defecto `true`).
 * @param options.pageSize    Tamaño de página (por defecto el tope de PostgREST).
 */
export async function fetchAllRows<Row = Record<string, unknown>>(
  // El tipo de retorno es `object` y no `QueryBuilder` a propósito: comparar el
  // `PostgrestFilterBuilder` generado contra `QueryBuilder` hace que TypeScript
  // recorra el `Database` completo y corte con TS2589 ("excessively deep").
  // La forma real se verifica adentro con un cast.
  build: () => object,
  options: { orderColumn?: string; ascending?: boolean; pageSize?: number } = {},
): Promise<Row[]> {
  const { orderColumn, ascending = true, pageSize = PAGE_SIZE } = options;
  const out: Row[] = [];

  for (let start = 0; ; start += pageSize) {
    let query = build() as QueryBuilder;
    if (orderColumn) {
      query = query.order(orderColumn, { ascending, nullsFirst: false });
    }

    const { data, error } = await query.range(start, start + pageSize - 1);
    if (error) throw error;

    const rows = (data ?? []) as Row[];
    if (rows.length === 0) break;

    out.push(...rows);
    if (rows.length < pageSize) break;
  }

  return out;
}