-- Guard de colisión de dispositivo en rpc_fixture_save_menu.
--
-- Problema: el fixture puede generar un 'update' que mueve a un ganador de un
-- dispositivo origen (A) a un destino (B) cuando ese ganador ya era ganador fijo
-- de A (shouldMove en ExecutionTab). Si en B ya existe una fila con la misma
-- clave lógica (agente, fecha[, turno, dispositivo]), el UPDATE `SET id_dispositivo=B`
-- viola uq_menu_agent_device_date / uq_menu_semana_asignacion (23505) y como el
-- RPC es transaccional, tumba TODO el guardado del fixture.
--
-- El cliente ya resuelve esto en persistMenuLike (useAssignmentData.ts:591-622):
-- si el dispositivo destino ya tiene una fila con la clave lógica, BORRA la fila
-- origen en vez de actualizarla (la fila destino ya representa el estado del agente).
-- Este RPC replicaba toda la lógica EXCEPTO ese guard → brecha.
--
-- Solución: replicar el guard. Cuando el payload mueve la fila a otro dispositivo
-- y en el destino ya existe una fila con la misma clave (id_dispositivo cambiado),
-- DELETE la fila origen y CONTINUE (no se toca la fila destino).

CREATE OR REPLACE FUNCTION public.rpc_fixture_save_menu(p_fecha date, p_ops jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed text[] := ARRAY[
    'id_agente','fecha_asignacion','id_turno','id_dispositivo','numero_grupo',
    'id_convocatoria','estado_ejecucion','tipo_organizacion','prioridad','acompaña_grupo'
  ];
  v_op jsonb;
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
BEGIN
  IF jsonb_typeof(p_ops) <> 'array' THEN
    RAISE EXCEPTION 'p_ops debe ser un array';
  END IF;

  FOR v_op IN SELECT * FROM jsonb_array_elements(p_ops) LOOP
    v_table := v_op->>'table';
    v_action := v_op->>'action';
    v_match := COALESCE(v_op->'match', '{}'::jsonb);
    v_payload := COALESCE(v_op->'payload', '{}'::jsonb);

    IF v_table NOT IN ('menu', 'menu_semana') THEN
      RAISE EXCEPTION 'tabla no soportada: %', v_table;
    END IF;

    -- Resolución best-effort de id_convocatoria (payload sin convocatoria explícita).
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
      EXCEPTION WHEN OTHERS THEN
        v_conv := NULL;
      END;
      IF v_conv IS NOT NULL THEN
        v_payload := jsonb_set(v_payload, '{id_convocatoria}', to_jsonb(v_conv));
      END IF;
    END IF;

    -- WHERE desde match (clave lógica), solo columnas whitelisteadas y no nulas.
    v_where := '';
    FOR v_k IN SELECT key FROM jsonb_each(v_match) WHERE value <> 'null'::jsonb LOOP
      IF NOT (v_k = ANY(v_allowed)) OR v_k IN ('id_menu', 'id_menu_semana') THEN CONTINUE; END IF;
      v_where := v_where || format(' AND %I = %L', v_k, jsonb_extract_path_text(v_match, v_k));
    END LOOP;
    IF v_where = '' THEN
      RAISE EXCEPTION 'operación sin match (tabla %, acción %)', v_table, v_action;
    END IF;
    v_where := substr(v_where, 6);

    IF v_action = 'delete' THEN
      EXECUTE format('DELETE FROM %I WHERE %s', v_table, v_where);
      v_applied := v_applied + 1;
      CONTINUE;
    END IF;

    IF v_action NOT IN ('upsert', 'update') THEN
      RAISE EXCEPTION 'acción no soportada: %', v_action;
    END IF;

    EXECUTE format('SELECT 1 FROM %I WHERE %s LIMIT 1', v_table, v_where) INTO v_exist;

    -- GUARD DE COLISIÓN (replica persistMenuLike):
    -- si el payload mueve la fila a otro dispositivo y en el destino ya existe una
    -- fila con la misma clave lógica, BORRA la fila origen (la destino ya
    -- representa el estado del agente). Evita 23505 en uq_*_agent_device_date /
    -- uq_menu_semana_asignacion.
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
      -- INSERT: match ∪ payload (payload gana en caso de conflicto), sin id_menu*.
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
      -- %L embebe cada valor como literal entre comillas (escapadas por format):
      -- valores de jsonb_extract_path_text son strings planos, sin riesgo de inyección.
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

  RETURN jsonb_build_object('ok', true, 'applied', v_applied);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_fixture_save_menu(date, jsonb) TO anon, authenticated;