-- Parametro opcional p_2do_semestre en rpc_metricas_acompana_anual.
--
-- El conteo de "veces que acompaña grupo" ahora puede filtrarse por la columna
-- "2do_semestre" (agregada en 20260820000000). Con p_2do_semestre = true cuenta
-- solo registros del 2do semestre; con NULL (default) mantiene el comportamiento
-- anterior (todo el año), así las llamadas existentes no cambian.

-- El DROP evita dejar dos overloads conviviendo (ambigüedad al resolver la llamada).

DROP FUNCTION IF EXISTS public.rpc_metricas_acompana_anual(integer);

CREATE OR REPLACE FUNCTION public.rpc_metricas_acompana_anual(
  p_year integer,
  p_2do_semestre boolean DEFAULT NULL
)
 RETURNS TABLE(id_agente integer, repeticiones bigint)
 LANGUAGE sql
AS $function$
        SELECT
            m.id_agente,
            COUNT(*) as repeticiones
        FROM (
            SELECT id_agente, fecha_asignacion
            FROM menu
            WHERE "acompaña_grupo" = true
              AND (p_2do_semestre IS NULL OR "2do_semestre" = p_2do_semestre)
            UNION
            SELECT ms.id_agente, ms.fecha_asignacion
            FROM menu_semana ms
            WHERE ms."acompaña_grupo" = true
              AND (p_2do_semestre IS NULL OR ms."2do_semestre" = p_2do_semestre)
        ) m
        WHERE EXTRACT(YEAR FROM m.fecha_asignacion) = p_year
        GROUP BY m.id_agente;
    $function$;

GRANT EXECUTE ON FUNCTION public.rpc_metricas_acompana_anual(integer, boolean) TO anon, authenticated;
