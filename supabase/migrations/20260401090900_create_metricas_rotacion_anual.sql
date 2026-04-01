CREATE OR REPLACE FUNCTION rpc_metricas_rotacion_anual(p_year INTEGER, p_turno VARCHAR)
RETURNS TABLE (
    id_agente INTEGER,
    id_dispositivo INTEGER,
    repeticiones BIGINT
)
LANGUAGE sql
AS $$
    SELECT
        m.id_agente,
        m.id_dispositivo,
        COUNT(*) as repeticiones
    FROM (
        SELECT id_agente, id_dispositivo, fecha_asignacion, 'apertura' as tipo_turno
        FROM menu
        WHERE id_dispositivo IS NOT NULL AND id_dispositivo != 999
        UNION ALL
        SELECT ms.id_agente, ms.id_dispositivo, ms.fecha_asignacion, t.tipo_turno
        FROM menu_semana ms
        JOIN turnos t ON ms.id_turno = t.id_turno
        WHERE ms.id_dispositivo IS NOT NULL AND ms.id_dispositivo != 999
    ) m
    WHERE EXTRACT(YEAR FROM m.fecha_asignacion) = p_year
      AND m.tipo_turno ILIKE '%' || p_turno || '%'
    GROUP BY m.id_agente, m.id_dispositivo;
$$;

GRANT EXECUTE ON FUNCTION rpc_metricas_rotacion_anual(INTEGER, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_metricas_rotacion_anual(INTEGER, VARCHAR) TO anon;
