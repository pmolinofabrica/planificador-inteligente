-- Fase 1: Portal de ingresos de residentes.
-- Los residentes marcan su ingreso al espacio con un código del día (sin cuentas de Supabase).
-- Los coordinadores ven la lista en vivo (polling) y el código para compartir.

CREATE TABLE IF NOT EXISTS public.ingresos_residentes (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  id_agente INTEGER NOT NULL,
  hora_ingreso TIMESTAMPTZ NOT NULL DEFAULT now(),
  codigo TEXT,
  UNIQUE (fecha, id_agente)
);

CREATE INDEX IF NOT EXISTS idx_ingresos_fecha ON public.ingresos_residentes(fecha);
CREATE INDEX IF NOT EXISTS idx_ingresos_agente ON public.ingresos_residentes(id_agente);

CREATE TABLE IF NOT EXISTS public.codigos_dia (
  fecha DATE PRIMARY KEY,
  codigo TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ingresos_residentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codigos_dia ENABLE ROW LEVEL SECURITY;

-- Coordinadores (authenticated): leen ingresos y pueden corregir un check-in erróneo
CREATE POLICY "ingresos_read_authenticated" ON public.ingresos_residentes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ingresos_delete_authenticated" ON public.ingresos_residentes
  FOR DELETE TO authenticated USING (true);

-- codigos_dia: lo gestiona el coordinador (upsert directo desde el panel)
CREATE POLICY "codigos_read_authenticated" ON public.codigos_dia
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "codigos_write_authenticated" ON public.codigos_dia
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- El insert de ingresos NO se habilita vía RLS directo: pasa por la función de abajo,
-- que valida el código y la existencia del residente (SECURITY DEFINER).
-- Sin policy de INSERT, el cliente anon/authenticated no puede insertar directo.

CREATE OR REPLACE FUNCTION public.rpc_marcar_ingreso(p_fecha date, p_id_agente integer, p_codigo text)
RETURNS TABLE (estado text, nombre text, hora timestamptz, ya_ingresado boolean)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_nombre text;
  v_hora timestamptz;
  v_existente timestamptz;
BEGIN
  -- 1. Validar código activo para la fecha
  IF NOT EXISTS (
    SELECT 1 FROM public.codigos_dia cd
    WHERE cd.fecha = p_fecha AND cd.codigo = p_codigo AND cd.activo
  ) THEN
    RETURN QUERY SELECT 'codigo_invalido', NULL::text, NULL::timestamptz, false;
    RETURN;
  END IF;

  -- 2. Validar residente activo y obtener nombre
  SELECT CONCAT(dp.apellido, ' ', dp.nombre) INTO v_nombre
  FROM public.datos_personales dp
  WHERE dp.id_agente = p_id_agente AND dp.activo = true;

  IF v_nombre IS NULL THEN
    RETURN QUERY SELECT 'residente_invalido', NULL::text, NULL::timestamptz, false;
    RETURN;
  END IF;

  -- 3. Idempotencia: si ya marcó, devolver el registro existente
  SELECT ir.hora_ingreso INTO v_existente
  FROM public.ingresos_residentes ir
  WHERE ir.fecha = p_fecha AND ir.id_agente = p_id_agente;

  IF v_existente IS NOT NULL THEN
    RETURN QUERY SELECT 'ya_ingresado', v_nombre, v_existente, true;
    RETURN;
  END IF;

  -- 4. Registrar ingreso
  INSERT INTO public.ingresos_residentes (fecha, id_agente, codigo)
  VALUES (p_fecha, p_id_agente, p_codigo)
  RETURNING hora_ingreso INTO v_hora;

  RETURN QUERY SELECT 'ok', v_nombre, v_hora, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_marcar_ingreso(date, integer, text) TO anon, authenticated;

-- Vista pública (solo nombres) para el portal: corre con privilegios del owner,
-- así anon puede leer sin exponer datos sensibles de datos_personales.
CREATE OR REPLACE VIEW public.vista_residentes_ingreso AS
SELECT dp.id_agente, dp.nombre, dp.apellido,
       CONCAT(dp.apellido, ' ', dp.nombre) AS nombre_completo
FROM public.datos_personales dp
WHERE dp.activo = true
  AND dp.cohorte = COALESCE(
    (SELECT cc.anio FROM public.config_cohorte cc WHERE cc.activo = true LIMIT 1),
    EXTRACT(YEAR FROM CURRENT_DATE)::integer
  )
ORDER BY dp.apellido, dp.nombre;

GRANT SELECT ON public.vista_residentes_ingreso TO anon, authenticated;

GRANT SELECT ON TABLE public.ingresos_residentes TO authenticated;
GRANT DELETE ON TABLE public.ingresos_residentes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.codigos_dia TO authenticated;

-- Pre-consulta del portal: el residente selecciona su nombre y ve si ya marcó hoy.
-- Solo devuelve la hora del propio check-in consultado; anon no lee la tabla directo.
CREATE OR REPLACE FUNCTION public.rpc_consulta_ingreso(p_fecha date, p_id_agente integer)
RETURNS TABLE (hora_ingreso timestamptz)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT ir.hora_ingreso
  FROM public.ingresos_residentes ir
  WHERE ir.fecha = p_fecha AND ir.id_agente = p_id_agente;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_consulta_ingreso(date, integer) TO anon, authenticated;
