import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabase-pagination";

/**
 * Carga de capacitaciones y planificación acotada al año.
 *
 * `capacitaciones`, `capacitaciones_participantes`, `capacitaciones_dispositivos`
 * y `planificacion` cuelgan todas de `dias.id_dia`, pero ninguna declara la FK
 * hacia `dias`, así que PostgREST no puede filtrarlas por fecha con `!inner`
 * ("Could not find a relationship"). Se resuelve en cascada: primero los días
 * del año, después lo que cuelga de ellos.
 *
 * El filtro va en el servidor a propósito. Con un solo año cargado no marcaba
 * diferencia, pero al abrir la cohorte 2027 sobre la misma base, las
 * capacitaciones de 2026 se cruzaban con los agentes de 2027 en
 * `buildResidentCaps` y los conteos de capacitación salían mezclados.
 */

export interface CapsRow { id_cap: number; id_dia: number; id_turno: number | null; grupo: string | null }
export interface PartRow { id_cap: number; id_agente: number; asistio: boolean | null }
export interface DispoRow { id_cap: number; id_dispositivo: number }
export interface PlaniRow { id_plani: number; id_dia: number; id_turno: number; grupo: string | null }
export interface DiaRow { id_dia: number; fecha: string }

export interface YearScopedData {
  dias: DiaRow[];
  caps: CapsRow[];
  parts: PartRow[];
  dispos: DispoRow[];
  planis: PlaniRow[];
}

/**
 * Superficie mínima de un builder de PostgREST, declarada a mano.
 *
 * Se declara así a propósito: encadenar `.from(tabla)` con un `tabla: string`
 * variable hace que TypeScript recorra el `Database` generado por Supabase para
 * resolver el nombre de la tabla y corte con TS2589 ("excessively deep"). El
 * cast evita esa resolución sin perder el chequeo de las llamadas del resto de
 * la app.
 */
interface MiniQuery {
  select(columnas: string): MiniQuery;
  in(columna: string, valores: readonly unknown[]): MiniQuery;
}

const db = supabase as unknown as { from(tabla: string): MiniQuery };

/** PostgREST devuelve 0 filas (no error) ante un `.in()` con lista vacía. */
async function fetchByIds<Row>(
  tabla: string,
  columna: string,
  ids: number[],
  columnas: string,
  orderColumn: string,
): Promise<Row[]> {
  if (ids.length === 0) return [];
  const query = db.from(tabla).select(columnas).in(columna, ids);
  return fetchAllRows<Row>(() => query as unknown as object, { orderColumn });
}

export async function fetchYearScopedData(year: number): Promise<YearScopedData> {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const dias = await fetchAllRows<DiaRow>(
    () => supabase.from('dias').select('id_dia, fecha').gte('fecha', yearStart).lte('fecha', yearEnd),
    { orderColumn: 'id_dia' },
  );

  const diasIds = dias.map(d => d.id_dia);
  const caps = await fetchByIds<CapsRow>('capacitaciones', 'id_dia', diasIds, 'id_cap, id_dia, id_turno, grupo', 'id_cap');
  const capIds = caps.map(c => c.id_cap);

  const [parts, dispos, planis] = await Promise.all([
    fetchByIds<PartRow>('capacitaciones_participantes', 'id_cap', capIds, 'id_cap, id_agente, asistio', 'id_participante'),
    fetchByIds<DispoRow>('capacitaciones_dispositivos', 'id_cap', capIds, 'id_cap, id_dispositivo', 'id_cap_dispo'),
    fetchByIds<PlaniRow>('planificacion', 'id_dia', diasIds, 'id_plani, id_dia, id_turno, grupo', 'id_plani'),
  ]);

  return { dias, caps, parts, dispos, planis };
}