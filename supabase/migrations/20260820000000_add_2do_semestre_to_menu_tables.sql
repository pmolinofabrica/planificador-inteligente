-- Columna "2do_semestre" (boolean) en menu y menu_semana.
--
-- 1) Agrega la columna a ambas tablas.
-- 2) Backfill: marca true en los registros cuyo id_convocatoria apunta a una
--    planificación cuyo día cae en el 2do semestre (agos-dic).
-- 3) Trigger de guardia: todo registro que inserte/actualice la app (drafts,
--    fixture RPC, sidebars) queda marcado true desde agosto hasta diciembre y
--    false en el resto, sin tocar código del cliente.

ALTER TABLE public.menu ADD COLUMN IF NOT EXISTS "2do_semestre" boolean;
ALTER TABLE public.menu_semana ADD COLUMN IF NOT EXISTS "2do_semestre" boolean;

-- Backfill via cadena id_convocatoria -> id_plani (planificacion) -> id_dia (dias).
UPDATE public.menu m
SET "2do_semestre" = true
WHERE m."2do_semestre" IS DISTINCT FROM true
  AND m.id_convocatoria IS NOT NULL
  AND m.id_convocatoria IN (
    SELECT c.id_convocatoria
    FROM public.convocatoria c
    JOIN public.planificacion pl ON pl.id_plani = c.id_plani
    JOIN public.dias d ON d.id_dia = pl.id_dia
    WHERE EXTRACT(MONTH FROM d.fecha) BETWEEN 8 AND 12
  );

UPDATE public.menu_semana ms
SET "2do_semestre" = true
WHERE ms."2do_semestre" IS DISTINCT FROM true
  AND ms.id_convocatoria IS NOT NULL
  AND ms.id_convocatoria IN (
    SELECT c.id_convocatoria
    FROM public.convocatoria c
    JOIN public.planificacion pl ON pl.id_plani = c.id_plani
    JOIN public.dias d ON d.id_dia = pl.id_dia
    WHERE EXTRACT(MONTH FROM d.fecha) BETWEEN 8 AND 12
  );

-- Red de seguridad: filas sin convocatoria resuelta se completan desde
-- fecha_asignacion, dejando la columna sin NULLs (true para ago-dic, false el resto).
UPDATE public.menu
SET "2do_semestre" = COALESCE(EXTRACT(MONTH FROM fecha_asignacion)::int BETWEEN 8 AND 12, false)
WHERE "2do_semestre" IS NULL;

UPDATE public.menu_semana
SET "2do_semestre" = COALESCE(EXTRACT(MONTH FROM fecha_asignacion)::int BETWEEN 8 AND 12, false)
WHERE "2do_semestre" IS NULL;

-- Trigger de guardia para los registros que vienen de la app.
CREATE OR REPLACE FUNCTION public.fn_set_2do_semestre()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."2do_semestre" := COALESCE(
    EXTRACT(MONTH FROM NEW.fecha_asignacion)::int BETWEEN 8 AND 12,
    false
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_menu_set_2do_semestre ON public.menu;
CREATE TRIGGER trg_menu_set_2do_semestre
  BEFORE INSERT OR UPDATE ON public.menu
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_2do_semestre();

DROP TRIGGER IF EXISTS trg_menu_semana_set_2do_semestre ON public.menu_semana;
CREATE TRIGGER trg_menu_semana_set_2do_semestre
  BEFORE INSERT OR UPDATE ON public.menu_semana
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_2do_semestre();
