-- RPC transaccional atómico para el guardado del fixture.
--
-- Extiende rpc_fixture_save_menu para incluir el upsert de fixture_plan
-- dentro de la misma transacción. Si cualquier operación falla, NINGUNA se aplica.
--
-- Cambios respecto a la versión anterior:
--   1. Acepta p_fixture_upserts (jsonb array) para upserts de fixture_plan.
--   2. EXCEPTION WHEN OTHERS reemplazado por capture selectivo de errores conocidos.
--   3. Retorna detalle de fixture_upserts aplicados.
--
-- Seguridad: SECURITY DEFINER (patrón del repo) + whitelist de columnas.

CREATE OR REPLACE FUNCTION public.rpc_fixture_save_atomic(
  p_fecha date,
  p_ops jsonb,
  p_fixture_upserts jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed text[] := ARRAY[
    'id_agente','fecha_asignacion','id_turno','id_dispositivo','numero_grupo',
    'id_convocatoria','estado_ejecucion','tipo_organizacion','prioridad',U&'acompa\00f1a_grupo'
  ];
  v_fixture_allowed text[] := ARRAY[
    'id_dispositivo','fecha','tipo_turno','prioridad','residente1','residente2','asignado'
  ];
  v_op jsonb;
  v_upsert jsonb;
  v_table text;
  v_action text;
  v_match jsonb;
  v_payload jsonb;
  v_row jsonb;
  v_where text := '';
  v_where_dest text := '';
  v_set text := '';
  v_cols text[] := '{}';
  v_vals text[] := '{}';
  v_sql text;
  v_exist int;
  v_exist_dest int;
  v_src_dev text;
  v_dst_dev text;
  v_conv int;
  v_agent int;
  v_turno int;
  v_k text;
  v_applied int := 0;
  v_fixture_applied int := 0;
  v_fid int;
BEGIN
  IF jsonb_typeof(p_ops) <> 'array' THEN
    RAISE EXCEPTION 'p_ops debe ser un array';
  END IF;

  IF jsonb_typeof(p_fixture_upserts) <> 'array' THEN
    RAISE EXCEPTION 'p_fixture_upserts debe ser un array';
  END IF;

  -- ═══════════════════════════════════════════════════════════
  -- FASE 1: Upsert fixture_plan (antes de menu para FAIL FAST)
  -- ═══════════════════════════════════════════════════════════
  FOR v_upsert IN SELECT * FROM jsonb_array_elements(p_fixture_upserts) LOOP
    v_fid := NULL;
    -- Check existing
    SELECT id_fixture INTO v_fid
    FROM public.fixture_plan
    WHERE id_dispositivo = (v_upsert->>'id_dispositivo')::int
      AND fecha = (v_upsert->>'fecha')::date
      AND tipo_turno = v_upsert->>'tipo_turno';

    IF v_fid IS NOT NULL THEN
      UPDATE public.fixture_plan SET
        prioridad = (v_upsert->>'prioridad')::int,
        residente1 = NULLIF(v_upsert->>'residente1', '')::int,
        residente2 = NULLIF(v_upsert->>'residente2', '')::int,
        asignado = v_upsert->>'asignado',
        updated_at = now()
      WHERE id_fixture = v_fid;
    ELSE
      INSERT INTO public.fixture_plan (id_dispositivo, fecha, tipo_turno, prioridad, residente1, residente2, asignado)
      VALUES (
        (v_upsert->>'id_dispositivo')::int,
        (v_upsert->>'fecha')::date,
        v_upsert->>'tipo_turno',
        (v_upsert->>'prioridad')::int,
        NULLIF(v_upsert->>'residente1', '')::int,
        NULLIF(v_upsert->>'residente2', '')::int,
        v_upsert->>'asignado'
      );
    END IF;
    v_fixture_applied := v_fixture_applied + 1;
  END LOOP;

  -- ═══════════════════════════════════════════════════════════
  -- FASE 2: Operaciones menu/menu_semana (igual que antes)
  -- ═══════════════════════════════════════════════════════════
  FOR v_op IN SELECT * FROM jsonb_array_elements(p_ops) LOOP
    v_table := v_op->>'table';
    v_action := v_op->>'action';
    v_match := COALESCE(v_op->'match', '{}'::jsonb);
    v_payload := COALESCE(v_op->'payload', '{}'::jsonb);

    IF v_table NOT IN ('menu', 'menu_semana') THEN
      RAISE EXCEPTION 'tabla no soportada: %', v_table;
    END IF;

    -- Resolución best-effort de id_convocatoria
    IF v_action = 'upsert' AND v_payload->>'id_convocatoria' IS NULL THEN
      v_agent := COALESCE((v_match->>'id_agente')::int, (v_payload->>'id_agente')::int);
      v_turno := NULLIF(v_payload->>'id_turno', '')::int;
      BEGIN
        SELECT c.id_convocatoria INTO v_conv
        FROM public.convocatoria c
        JOIN public.planificacion pl ON pl.id_plani = c.id_plani
        JOIN public.dias d ON d.id_dia = pl.id_dia
        WHERE c.id_agente = v_agent
          AND c.estado = 'vigente'
          AND d.fecha = p_fecha
          AND (v_turno IS NULL OR pl.id_turno = v_turno)
        LIMIT 1;
      EXCEPTION
        WHEN undefined_column THEN
          v_conv := NULL;
      WHEN undefined_table THEN
        v_conv := NULL;
      WHEN no_data_found THEN
        v_conv := NULL;
      WHEN too_many_rows THEN
        -- Take first result
        SELECT c.id_convocatoria INTO v_conv
        FROM public.convocatoria c
        JOIN public.planificacion pl ON pl.id_plani = c.id_plani
        JOIN public.dias d ON d.id_dia = pl.id_dia
        WHERE c.id_agente = v_agent
          AND c.estado = 'vigente'
          AND d.fecha = p_fecha
          AND (v_turno IS NULL OR pl.id_turno = v_turno)
        LIMIT 1;
      END;
      IF v_conv IS NOT NULL THEN
        v_payload := jsonb_set(v_payload, '{id_convocatoria}', to_jsonb(v_conv));
      END IF;
    END IF;

    -- WHERE desde match
    v_where := '';
    FOR v_k IN SELECT key FROM jsonb_each(v_match) WHERE value <> 'null'::jsonb LOOP
      IF NOT (v_k = ANY(v_allowed)) OR v_k IN ('id_menu', 'id_menu_semana') THEN CONTINUE; END IF;
      v_where := v_where || format(' AND %I = %L', v_k, jsonb_extract_path_text(v_match, v_k));
    END LOOP;
    IF v_where = '' THEN
      RAISE EXCEPTION 'operacion sin match (tabla %, accion %)', v_table, v_action;
    END IF;
    v_where := substr(v_where, 6);

    IF v_action = 'delete' THEN
      EXECUTE format('DELETE FROM %I WHERE %s', v_table, v_where);
      v_applied := v_applied + 1;
      CONTINUE;
    END IF;

    IF v_action NOT IN ('upsert', 'update') THEN
      RAISE EXCEPTION 'accion no soportada: %', v_action;
    END IF;

    EXECUTE format('SELECT 1 FROM %I WHERE %s LIMIT 1', v_table, v_where) INTO v_exist;

    -- GUARD DE COLISIÓN
    v_src_dev := v_match->>'id_dispositivo';
    v_dst_dev := v_payload->>'id_dispositivo';
    IF v_exist IS NOT NULL AND v_src_dev IS NOT NULL AND v_dst_dev IS NOT NULL
       AND v_src_dev <> v_dst_dev THEN
      v_where_dest := '';
      FOR v_k IN SELECT key FROM jsonb_each(v_match) WHERE value <> 'null'::jsonb LOOP
        IF NOT (v_k = ANY(v_allowed)) OR v_k IN ('id_menu', 'id_menu_semana') THEN CONTINUE; END IF;
        IF v_k = 'id_dispositivo' THEN
          v_where_dest := v_where_dest || format(' AND %I = %L', v_k, v_dst_dev);
        ELSE
          v_where_dest := v_where_dest || format(' AND %I = %L', v_k, jsonb_extract_path_text(v_match, v_k));
        END IF;
      END LOOP;
      v_where_dest := substr(v_where_dest, 6);
      EXECUTE format('SELECT 1 FROM %I WHERE %s LIMIT 1', v_table, v_where_dest) INTO v_exist_dest;
      IF v_exist_dest IS NOT NULL THEN
        EXECUTE format('DELETE FROM %I WHERE %s', v_table, v_where);
        v_applied := v_applied + 1;
        CONTINUE;
      END IF;
    END IF;

    IF v_exist IS NOT NULL THEN
      v_set := '';
      FOR v_k IN SELECT key FROM jsonb_each(v_payload) WHERE value <> 'null'::jsonb LOOP
        IF NOT (v_k = ANY(v_allowed))
           OR v_k IN ('id_menu', 'id_menu_semana', 'id_agente', 'fecha_asignacion') THEN CONTINUE; END IF;
        v_set := v_set || format(', %I = %L', v_k, jsonb_extract_path_text(v_payload, v_k));
      END LOOP;
      IF v_set <> '' THEN
        v_set := substr(v_set, 2);
        EXECUTE format('UPDATE %I SET %s WHERE %s', v_table, v_set, v_where);
      END IF;
    ELSE
      v_row := v_match || v_payload;
      v_cols := '{}';
      v_vals := '{}';
      FOR v_k IN SELECT key FROM jsonb_each(v_row) WHERE value <> 'null'::jsonb LOOP
        IF NOT (v_k = ANY(v_allowed)) OR v_k IN ('id_menu', 'id_menu_semana') THEN CONTINUE; END IF;
        v_cols := array_append(v_cols, v_k);
        v_vals := array_append(v_vals, jsonb_extract_path_text(v_row, v_k));
      END LOOP;
      IF NOT ('fecha_asignacion' = ANY(v_cols)) THEN
        v_cols := array_append(v_cols, 'fecha_asignacion');
        v_vals := array_append(v_vals, to_char(p_fecha, 'YYYY-MM-DD'));
      END IF;
      v_sql := format(
        'INSERT INTO %I (%s) VALUES (%s)',
        v_table,
        (SELECT string_agg(format('%I', c), ', ') FROM unnest(v_cols) c),
        (SELECT string_agg(format('%L', v), ', ') FROM unnest(v_vals) v)
      );
      EXECUTE v_sql;
    END IF;
    v_applied := v_applied + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'applied', v_applied,
    'fixture_applied', v_fixture_applied
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_fixture_save_atomic(date, jsonb, jsonb) TO authenticated;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ SEGURIDAD: GRANT a 'anon' no incluido deliberadamente.                 ║
-- ║ El RPC es SECURITY DEFINER (bypasea RLS). Otorgar EXECUTE a 'anon'     ║
-- ║ permitiría a usuarios no autenticados modificar menu/menu_semana y     ║
-- ║ fixture_plan. Solo 'authenticated' tiene acceso.                       ║
-- ║                                                                        ║
-- ║ Si en el futuro se necesita acceso anónimo (p.ej. portal público),     ║
-- ║ considerar:                                                             ║
-- ║   1. Agregar validación de role interno:                               ║
-- ║      IF current_setting('role') != 'authenticated' THEN RAISE...       ║
-- ║   2. Usar una función separada con permisos más restrictivos.          ║
-- ║   3. Documentar la superficie de ataque.                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
