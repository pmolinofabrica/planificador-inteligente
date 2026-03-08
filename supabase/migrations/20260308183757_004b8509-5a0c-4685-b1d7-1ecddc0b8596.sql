
-- Trigger: when convocatoria.id_plani changes (grupo change),
-- move cap_participantes from old grupo's cap to new grupo's cap
CREATE OR REPLACE FUNCTION public.fn_sync_cap_participantes_on_grupo_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_plani RECORD;
    v_new_plani RECORD;
    v_old_cap_id INTEGER;
    v_new_cap_id INTEGER;
BEGIN
    -- Only act if id_plani actually changed
    IF OLD.id_plani = NEW.id_plani THEN
        RETURN NEW;
    END IF;

    -- Get old and new planificacion details
    SELECT id_dia, id_turno, grupo INTO v_old_plani FROM planificacion WHERE id_plani = OLD.id_plani;
    SELECT id_dia, id_turno, grupo INTO v_new_plani FROM planificacion WHERE id_plani = NEW.id_plani;

    -- Only act if the grupo actually changed (same date scenario)
    IF v_old_plani.grupo IS NOT DISTINCT FROM v_new_plani.grupo THEN
        RETURN NEW;
    END IF;

    -- Find the old capacitacion (matching old plani's dia+turno+grupo)
    SELECT id_cap INTO v_old_cap_id
    FROM capacitaciones
    WHERE id_dia = v_old_plani.id_dia
      AND id_turno = v_old_plani.id_turno
      AND (grupo = v_old_plani.grupo OR (grupo IS NULL AND v_old_plani.grupo IS NULL))
    LIMIT 1;

    -- Find the new capacitacion (matching new plani's dia+turno+grupo)
    SELECT id_cap INTO v_new_cap_id
    FROM capacitaciones
    WHERE id_dia = v_new_plani.id_dia
      AND id_turno = v_new_plani.id_turno
      AND (grupo = v_new_plani.grupo OR (grupo IS NULL AND v_new_plani.grupo IS NULL))
    LIMIT 1;

    -- Remove from old cap (if exists)
    IF v_old_cap_id IS NOT NULL THEN
        DELETE FROM capacitaciones_participantes
        WHERE id_cap = v_old_cap_id
          AND id_agente = NEW.id_agente;
    END IF;

    -- Insert into new cap (if exists and not already there)
    IF v_new_cap_id IS NOT NULL THEN
        INSERT INTO capacitaciones_participantes (id_cap, id_agente, asistio, observaciones)
        VALUES (v_new_cap_id, NEW.id_agente, TRUE, 'Auto-movido por cambio de grupo')
        ON CONFLICT (id_cap, id_agente) DO UPDATE SET
            asistio = TRUE,
            observaciones = COALESCE(capacitaciones_participantes.observaciones, '') || ' | Re-asignado por cambio de grupo';
    END IF;

    RETURN NEW;
END;
$$;

-- Attach trigger to convocatoria table on UPDATE
CREATE TRIGGER trg_sync_cap_on_grupo_change
    BEFORE UPDATE ON public.convocatoria
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_cap_participantes_on_grupo_change();
