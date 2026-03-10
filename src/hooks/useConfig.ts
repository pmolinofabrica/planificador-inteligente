import { supabase } from '@/integrations/supabase/client';

/**
 * Retorna el año de cohorte activo.
 * Por defecto usa el año en curso.
 * Si en el futuro se crea la tabla config_cohorte, este hook la consultará automáticamente.
 */
export async function getActiveCohorte(): Promise<number> {
  try {
    // Cast to any porque config_cohorte no está en el schema generado aún.
    // Si la tabla no existe, retorna el año en curso silenciosamente.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('config_cohorte')
      .select('cohorte_activa')
      .limit(1)
      .maybeSingle();

    if (error) return new Date().getFullYear();

    return (data as { cohorte_activa: number } | null)?.cohorte_activa ?? new Date().getFullYear();
  } catch {
    return new Date().getFullYear();
  }
}

/**
 * Retorna el año de cohorte activo de forma sincrónica.
 * Usa el año en curso como default.
 */
export function getActiveCohorteSync(): number {
  return new Date().getFullYear();
}
