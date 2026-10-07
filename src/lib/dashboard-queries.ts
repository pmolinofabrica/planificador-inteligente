import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabase-pagination";

/** Fila cruda de las consultas de `acompaña_grupo` (menu y menu_semana). */
export interface AcompanaRow {
  id_agente: number;
  fecha_asignacion: string;
  "2do_semestre": boolean | null;
}

/**
 * Superficie mínima de un builder de PostgREST: solo los filtros que usa este
 * módulo. Se declara a mano porque encadenarlos contra el tipo `Database`
 * generado por Supabase dispara TS2589 ("excessively deep") al resolver el
 * `select` con una columna que necesita comillas.
 */
interface MiniQuery {
  select(columns: string): MiniQuery;
  eq(column: string, value: unknown): MiniQuery;
  gte(column: string, value: string): MiniQuery;
  lte(column: string, value: string): MiniQuery;
}

const db = supabase as unknown as { from(tabla: string): MiniQuery };

const SELECT_ACOMPANA = 'id_agente, fecha_asignacion, "2do_semestre"';

async function fetchAcompana(
  tabla: string,
  orderColumn: string,
  yearStart: string,
  yearEnd: string,
): Promise<AcompanaRow[]> {
  const query = db.from(tabla)
    .select(SELECT_ACOMPANA)
    .eq("acompaña_grupo", true)
    .gte("fecha_asignacion", yearStart)
    .lte("fecha_asignacion", yearEnd);

  return fetchAllRows<AcompanaRow>(() => query as unknown as object, { orderColumn });
}

/**
 * Registros de `acompaña_grupo` del año, de `menu` y `menu_semana`, paginados
 * para superar el tope de 1000 filas de PostgREST.
 */
export async function fetchAcompanaRows(
  yearStart: string,
  yearEnd: string,
): Promise<[AcompanaRow[], AcompanaRow[]]> {
  const [menu, menuSemana] = await Promise.all([
    fetchAcompana("menu", "id_menu", yearStart, yearEnd),
    fetchAcompana("menu_semana", "id_menu_semana", yearStart, yearEnd),
  ]);

  return [menu, menuSemana];
}