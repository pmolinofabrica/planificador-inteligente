ALTER TABLE public.datos_personales
  ADD COLUMN refuerzo boolean DEFAULT false,
  ADD COLUMN periodo_refuerzo integer[] DEFAULT '{}';

-- Actualizar RLS: asegurar que las políticas existentes cubren las nuevas columnas
-- (las políticas existentes ya hacen SELECT/INSERT/UPDATE en toda la tabla con USING(true), no se requieren cambios)
