-- Fix del contador de rotación por dispositivo.
--
-- rpc_metricas_rotacion_anual contaba FILAS (COUNT(*) sobre UNION ALL de
-- menu + menu_semana). En menu_semana un residente puede tener MÚLTIPLES filas
-- por el mismo (id_agente, id_dispositivo, fecha_asignacion): una por cada
-- grupo en el que coordina ese dispositivo el mismo día (p. ej. 3 grupos en
-- turno tarde = 3 filas).
--
-- La unidad correcta es "por día": una coordinación de un dispositivo en una
-- fecha cuenta como 1, sin importar cuántos grupos tenga ese día. Por eso cada
-- subquery usa SELECT DISTINCT (id_agente, id_dispositivo, fecha_asignacion)
-- antes del COUNT(*). Así coincide con el conteo del Dashboard de Rotación
-- (dedup por id_agente + id_dispositivo + fecha).

CREATE OR REPLACE FUNCTION public.rpc_metricas_rotacion_anual(p_year integer, p_turno character varying)
 RETURNS TABLE(id_agente integer, id_dispositivo integer, repeticiones bigint)
 LANGUAGE sql
AS $function$
        SELECT
            m.id_agente,
            m.id_dispositivo,
            COUNT(*) as repeticiones
        FROM (
            SELECT DISTINCT id_agente, id_dispositivo, fecha_asignacion, 'apertura' as tipo_turno
            FROM menu
            WHERE id_dispositivo IS NOT NULL AND id_dispositivo != 999
            UNION ALL
            SELECT DISTINCT ms.id_agente, ms.id_dispositivo, ms.fecha_asignacion, t.tipo_turno
            FROM menu_semana ms
            JOIN turnos t ON ms.id_turno = t.id_turno
            WHERE ms.id_dispositivo IS NOT NULL AND ms.id_dispositivo != 999
        ) m
        WHERE EXTRACT(YEAR FROM m.fecha_asignacion) = p_year
          AND m.tipo_turno ILIKE '%' || p_turno || '%'
        GROUP BY m.id_agente, m.id_dispositivo;
    $function$;

GRANT EXECUTE ON FUNCTION public.rpc_metricas_rotacion_anual(INTEGER, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_metricas_rotacion_anual(INTEGER, VARCHAR) TO anon;