-- Fix del contador "veces que acompaña grupo".
--
-- rpc_metricas_acompana_anual contaba FILAS (COUNT(*) sobre UNION ALL de
-- menu + menu_semana). Un residente que acompaña un grupo en tarde/mañana
-- queda marcado con acompaña_grupo=true en varios dispositivos (un piso por
-- fila), así que un mismo día se contaba N veces en vez de 1.
--
-- La unidad correcta es "por día": contar un evento por (id_agente, fecha).
-- Se cambia UNION ALL por UNION, que colapsa las filas idénticas
-- (id_agente, fecha_asignacion) tanto dentro de menu_semana (multi-piso)
-- como entre menu y menu_semana del mismo día. Así coincide con el conteo
-- que ya usa el Dashboard de Rotación (dedup por agente + fecha).

CREATE OR REPLACE FUNCTION public.rpc_metricas_acompana_anual(p_year integer)
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
            UNION
            SELECT ms.id_agente, ms.fecha_asignacion
            FROM menu_semana ms
            WHERE ms."acompaña_grupo" = true
        ) m
        WHERE EXTRACT(YEAR FROM m.fecha_asignacion) = p_year
        GROUP BY m.id_agente;
    $function$;