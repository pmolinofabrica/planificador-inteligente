const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.zgzqeusbpobrwanvktyz:UcA5EQxfEYd1Nb@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
});

async function runPg() {
  await client.connect();

  const sql = `
    -- First, drop the function that depends on the view, so we can replace the view
    DROP FUNCTION IF EXISTS public.rpc_obtener_vista_capacitados();

    -- Drop the view
    DROP VIEW IF EXISTS public.vista_agentes_capacitados;

    -- Re-create the view using BOTH paths (Direct Attendance + Convocados Matriz)
    -- As replicating the "Path 1.5" (general absence) logic in a pure view can be heavy, we will use a CTE.

    CREATE OR REPLACE VIEW public.vista_agentes_capacitados AS
    WITH inasistencias_generales AS (
      SELECT DISTINCT id_agente, fecha_inasistencia
      FROM inasistencias
      WHERE fecha_inasistencia IS NOT NULL
    ),
    -- Path 1: Asistencia Directa (marcada manualmente)
    asistentes_directos AS (
      SELECT
        cp.id_agente,
        cp.id_cap,
        TRUE AS asistio,
        'ASISTENCIA DIRECTA'::text AS origen
      FROM capacitaciones_participantes cp
      WHERE cp.asistio = true
    ),
    -- Path 2: Convocados Matriz (los que tienen convocatoria el mismo día, turno y grupo)
    convocados_matriz_bruto AS (
      SELECT
        c.id_cap,
        dp.id_agente,
        c.id_dia,
        d.fecha AS fecha_cap
      FROM capacitaciones c
      JOIN dias d ON c.id_dia = d.id_dia
      CROSS JOIN datos_personales dp
      WHERE dp.activo = true
      AND dp.cohorte = EXTRACT(YEAR FROM d.fecha)
      AND EXISTS (
        SELECT 1
        FROM convocatoria conv
        JOIN planificacion p ON conv.id_plani = p.id_plani
        WHERE p.id_dia = c.id_dia
          AND p.id_turno = c.id_turno
          AND (p.grupo = c.grupo OR (p.grupo IS NULL AND c.grupo IS NULL))
          AND conv.id_agente = dp.id_agente
          AND conv.estado = 'vigente'
          AND conv.turno_cancelado = false
      )
    ),
    convocados_matriz_filtrado AS (
      SELECT
        cmb.id_agente,
        cmb.id_cap,
        TRUE AS asistio,
        'CONVOCATORIA MATRIZ'::text AS origen
      FROM convocados_matriz_bruto cmb
      -- Excluir si tienen inasistencia directa a la capacitacion
      LEFT JOIN capacitaciones_participantes cp ON cp.id_cap = cmb.id_cap AND cp.id_agente = cmb.id_agente
      -- Excluir si tienen inasistencia general ese dia
      LEFT JOIN inasistencias_generales ig ON ig.id_agente = cmb.id_agente AND ig.fecha_inasistencia = cmb.fecha_cap
      WHERE (cp.asistio IS DISTINCT FROM false)
        AND ig.id_agente IS NULL
    ),
    -- Combinamos ambos paths (Union)
    todos_capacitados AS (
      SELECT id_agente, id_cap FROM asistentes_directos
      UNION
      SELECT id_agente, id_cap FROM convocados_matriz_filtrado
    )
    SELECT
      disp.id_dispositivo,
      disp.nombre_dispositivo,
      dp.id_agente,
      ((dp.nombre::text || ' '::text) || dp.apellido::text) AS nombre_completo,
      cap.tema AS capacitacion,
      true AS asistio,
      d.fecha AS fecha_capacitacion,
      'CAPACITADO'::text AS estado_capacitacion
    FROM todos_capacitados tc
    JOIN capacitaciones cap ON tc.id_cap = cap.id_cap
    JOIN capacitaciones_dispositivos cap_disp ON cap.id_cap = cap_disp.id_cap
    JOIN dispositivos disp ON cap_disp.id_dispositivo = disp.id_dispositivo
    JOIN datos_personales dp ON tc.id_agente = dp.id_agente
    JOIN dias d ON cap.id_dia = d.id_dia
    WHERE dp.activo = true
    ORDER BY disp.nombre_dispositivo, dp.apellido;

    -- Re-create the RPC wrapper
    CREATE OR REPLACE FUNCTION public.rpc_obtener_vista_capacitados()
    RETURNS SETOF vista_agentes_capacitados
    LANGUAGE sql
    SECURITY DEFINER
    AS $function$
      SELECT * FROM vista_agentes_capacitados;
    $function$;

    -- Grant permissions
    GRANT ALL ON public.vista_agentes_capacitados TO authenticated;
    GRANT ALL ON public.vista_agentes_capacitados TO service_role;
    GRANT EXECUTE ON FUNCTION public.rpc_obtener_vista_capacitados() TO authenticated;
    GRANT EXECUTE ON FUNCTION public.rpc_obtener_vista_capacitados() TO service_role;
  `;

  try {
    await client.query(sql);
    console.log("View successfully updated to include Matrix Paths!");
  } catch (err) {
    console.error("PG Error updating view:", err.message);
  }

  await client.end();
}

runPg();
