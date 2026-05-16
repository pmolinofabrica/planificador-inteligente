-- Trigger: Cuando se agrega un agente a una convocatoria, sumarlo a la capacitacion (si existe)
CREATE OR REPLACE FUNCTION public.fn_sync_cap_participantes_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plani RECORD;
    v_cap_id INTEGER;
BEGIN
    -- Obtenemos dia, turno, grupo de la planificacion a la que convocan
    SELECT id_dia, id_turno, grupo INTO v_plani FROM planificacion WHERE id_plani = NEW.id_plani;
    
    IF v_plani IS NULL THEN
        RETURN NEW;
    END IF;

    -- Buscamos la capacitacion correspondiente
    SELECT id_cap INTO v_cap_id
    FROM capacitaciones
    WHERE id_dia = v_plani.id_dia
      AND id_turno = v_plani.id_turno
      AND (grupo = v_plani.grupo OR v_plani.grupo IS NULL OR grupo IS NULL)
    LIMIT 1;
    
    -- Si existe una capacitacion para esa planificacion, lo insertamos
    IF v_cap_id IS NOT NULL THEN
        INSERT INTO capacitaciones_participantes (id_cap, id_agente, asistio, observaciones)
        VALUES (v_cap_id, NEW.id_agente, NULL, 'Convocado desde planificación')
        ON CONFLICT (id_cap, id_agente) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_cap_on_insert ON public.convocatoria;
CREATE TRIGGER trg_sync_cap_on_insert
    AFTER INSERT ON public.convocatoria
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_cap_participantes_on_insert();


-- Trigger: Cuando se elimina un agente de una convocatoria, quitarlo de la capacitacion
CREATE OR REPLACE FUNCTION public.fn_sync_cap_participantes_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plani RECORD;
    v_cap_id INTEGER;
BEGIN
    SELECT id_dia, id_turno, grupo INTO v_plani FROM planificacion WHERE id_plani = OLD.id_plani;
    
    IF v_plani IS NULL THEN
        RETURN OLD;
    END IF;

    SELECT id_cap INTO v_cap_id
    FROM capacitaciones
    WHERE id_dia = v_plani.id_dia
      AND id_turno = v_plani.id_turno
      AND (grupo = v_plani.grupo OR v_plani.grupo IS NULL OR grupo IS NULL)
    LIMIT 1;
    
    IF v_cap_id IS NOT NULL THEN
        DELETE FROM capacitaciones_participantes
        WHERE id_cap = v_cap_id AND id_agente = OLD.id_agente;
    END IF;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_cap_on_delete ON public.convocatoria;
CREATE TRIGGER trg_sync_cap_on_delete
    AFTER DELETE ON public.convocatoria
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_cap_participantes_on_delete();


-- Trigger: Cuando se crea una capacitacion nueva, importar a los convocados (si la planificacion ya existia)
CREATE OR REPLACE FUNCTION public.fn_sync_cap_participantes_on_cap_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plani_id INTEGER;
BEGIN
    -- Buscamos el id_plani correspondiente
    SELECT id_plani INTO v_plani_id
    FROM planificacion
    WHERE id_dia = NEW.id_dia
      AND id_turno = NEW.id_turno
      AND (grupo = NEW.grupo OR NEW.grupo IS NULL OR grupo IS NULL)
    LIMIT 1;

    -- Si existe una planificacion con convocatorias, insertamos a todos los agentes
    IF v_plani_id IS NOT NULL THEN
        INSERT INTO capacitaciones_participantes (id_cap, id_agente, asistio, observaciones)
        SELECT NEW.id_cap, id_agente, NULL, 'Importado al crear la capacitacion'
        FROM convocatoria
        WHERE id_plani = v_plani_id
        ON CONFLICT (id_cap, id_agente) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_cap_on_cap_insert ON public.capacitaciones;
CREATE TRIGGER trg_sync_cap_on_cap_insert
    AFTER INSERT ON public.capacitaciones
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_cap_participantes_on_cap_insert();

