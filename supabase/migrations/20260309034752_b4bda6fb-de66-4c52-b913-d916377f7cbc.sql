
-- Change numero_grupo from integer to integer[] to support multiple groups per visit
ALTER TABLE public.asignaciones_visita
  ALTER COLUMN numero_grupo TYPE integer[]
  USING CASE WHEN numero_grupo IS NOT NULL THEN ARRAY[numero_grupo] ELSE NULL END;
