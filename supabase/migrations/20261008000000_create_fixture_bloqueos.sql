-- Bloqueo de residentes para el modo de asignación "fixture".
--
-- Objetivo: permitir excluir residentes del selector de fixture de una
-- (fecha, tipo_turno) concreta porque ya están asignados o fueron asignados
-- previamente en otro dispositivo.
--
-- Diseño:
--   - Un registro = un residente bloqueado para un (fecha, tipo_turno).
--   - UNIQUE (fecha, tipo_turno, id_agente) para que la fila sea idempotente:
--     volver a tildar el mismo checkbox no duplica nada.
--   - tipo_turno replica fixture_plan.tipo_turno ('apertura' | 'tarde' | 'manana')
--     porque es la clave que ya usa el resto del flujo de fixture.

CREATE TABLE IF NOT EXISTS public.fixture_bloqueos (
  id_bloqueo BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  tipo_turno TEXT NOT NULL,
  id_agente INTEGER NOT NULL REFERENCES public.datos_personales(id_agente) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_fixture_bloqueos UNIQUE (fecha, tipo_turno, id_agente)
);

-- El flujo siempre consulta por (fecha, tipo_turno); este índice evita el seq scan.
CREATE INDEX IF NOT EXISTS idx_fixture_bloqueos_fecha_turno
  ON public.fixture_bloqueos (fecha, tipo_turno);

ALTER TABLE public.fixture_bloqueos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fixture_bloqueos_read_authenticated" ON public.fixture_bloqueos;
CREATE POLICY "fixture_bloqueos_read_authenticated"
  ON public.fixture_bloqueos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "fixture_bloqueos_write_authenticated" ON public.fixture_bloqueos;
CREATE POLICY "fixture_bloqueos_write_authenticated"
  ON public.fixture_bloqueos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sin GRANT Postgres rechaza a nivel de tabla ANTES de evaluar RLS
-- (mismo problema que corrigio 20260715000001_fix_user_preferences_permissions.sql).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.fixture_bloqueos TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.fixture_bloqueos_id_bloqueo_seq TO authenticated;


-- Sincronización atómica de los bloqueos de una (fecha, tipo_turno).
--
-- Recibe el conjunto completo de bloqueos aplicables y deja la tabla exactamente
-- como ese conjunto. Es idempotente: si se llama dos veces con lo mismo, el
-- segundo call es un no-op (por eso el ON CONFLICT y el DELETE dirigido).
--
-- Por qué no se borra todo y se reinserta: así dos dispositivos que guardan
-- con listas distintas no se pisan entre sí al Eventually-consistent read, y
-- un fallo de red a mitad de camino no deja la fecha sin bloqueos.
CREATE OR REPLACE FUNCTION public.rpc_fixture_bloqueos_sync(
  p_fecha date,
  p_tipo_turno text,
  p_bloquear integer[] DEFAULT '{}'::integer[],
  p_desbloquear integer[] DEFAULT '{}'::integer[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bloquear integer[] := COALESCE(p_bloquear, '{}'::integer[]);
  v_desbloquear integer[] := COALESCE(p_desbloquear, '{}'::integer[]);
  v_borrados int := 0;
  v_insertados int := 0;
BEGIN
  -- 1) Destildar: se borran SOLO las filas que el usuario acaba de sacar.
  IF array_length(v_desbloquear, 1) IS NOT NULL THEN
    DELETE FROM public.fixture_bloqueos b
     WHERE b.fecha = p_fecha
       AND b.tipo_turno = p_tipo_turno
       AND b.id_agente = ANY (v_desbloquear);
    GET DIAGNOSTICS v_borrados = ROW_COUNT;
  END IF;

  -- 2) Tildar: se filtran los id_agente inexistentes para no abortar toda la
  --    transacción con una violación de FK si el cliente manda basura.
  IF array_length(v_bloquear, 1) IS NOT NULL THEN
    INSERT INTO public.fixture_bloqueos (fecha, tipo_turno, id_agente)
    SELECT p_fecha, p_tipo_turno, d.id_agente
      FROM public.datos_personales d
     WHERE d.id_agente = ANY (v_bloquear)
    ON CONFLICT (fecha, tipo_turno, id_agente) DO NOTHING;
    GET DIAGNOSTICS v_insertados = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'borrados', v_borrados,
    'insertados', v_insertados
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_fixture_bloqueos_sync(date, text, integer[], integer[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_fixture_bloqueos_sync(date, text, integer[], integer[]) TO authenticated;