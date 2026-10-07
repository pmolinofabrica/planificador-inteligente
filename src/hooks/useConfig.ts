import { supabase } from '@/integrations/supabase/client';

/**
 * Año (cohorte) con el que trabaja la app.
 *
 * La fuente de verdad es `config_cohorte.activo`: hay exactamente un año con
 * `activo = true` y ese es el que se usa. Antes esto devolvía
 * `new Date().getFullYear()`, lo que hacía que la cohorte dependiera del reloj
 * en lugar de de la configuración.
 *
 * Si la tabla no está disponible o no hay ninguna fila activa, se cae al año
 * del reloj para que la app siga funcionando.
 */

/** Año en curso según el reloj. Último recurso. */
function currentYearFallback(): number {
  return new Date().getFullYear();
}

/**
 * Cohorte activa declarada en `config_cohorte`, o `null` si no hay exactamente
 * una activa. Una función aparte (y sin caché) para que los tests puedan
 * simular la respuesta de Supabase.
 */
async function queryActiveCohorte(): Promise<number | null> {
  const { data, error } = await supabase
    .from('config_cohorte')
    .select('anio')
    .eq('activo', true);

  if (error || !data || data.length === 0) return null;

  // Si por error de configuración hubiera varias activas, se toma la más alta:
  // es la más reciente y la que corresponde al ciclo en curso.
  const anios = data.map(r => r.anio).filter((a): a is number => typeof a === 'number');
  if (anios.length === 0) return null;
  return Math.max(...anios);
}

/** Cohorte activa según `config_cohorte`. */
export async function getActiveCohorte(): Promise<number> {
  try {
    return (await queryActiveCohorte()) ?? currentYearFallback();
  } catch {
    return currentYearFallback();
  }
}

/**
 * Cohorte activa resuelta una sola vez y reutilizada.
 *
 * Antes se llamaba a `getActiveCohorteSync()` en cada render, lo que hacía una
 * consulta a la base por cada hook que la usaba. Ahora se resuelve una vez y se
 * guarda el resultado junto con una marca de invalidez.
 */
let cachedCohorte: number | null = null;
let cachedPromise: Promise<number> | null = null;

/** Descarta la cohorte cacheada (tras `hardRefresh` o al cambiar de sesión). */
export function invalidateCohorteCache(): void {
  cachedCohorte = null;
  cachedPromise = null;
}

export function getActiveCohorteSync(): number {
  return cachedCohorte ?? currentYearFallback();
}

/** Igual que `getActiveCohorte` pero reutiliza la promesa en vuelo. */
export function preloadActiveCohorte(): Promise<number> {
  if (cachedCohorte !== null) return Promise.resolve(cachedCohorte);
  if (!cachedPromise) {
    cachedPromise = getActiveCohorte().then((cohorte) => {
      cachedCohorte = cohorte;
      cachedPromise = null;
      return cohorte;
    });
  }
  return cachedPromise;
}