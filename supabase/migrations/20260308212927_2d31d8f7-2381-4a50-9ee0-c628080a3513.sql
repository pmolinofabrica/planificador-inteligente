
-- =============================================
-- Remove all "Acceso Total" public-role policies
-- that grant unauthenticated access
-- =============================================

-- datos_personales: Remove public ALL policy
DROP POLICY IF EXISTS "Acceso Total Personales" ON public.datos_personales;

-- convocatoria: Remove public ALL policy
DROP POLICY IF EXISTS "Acceso Total Convocatoria" ON public.convocatoria;

-- saldos: Remove public ALL policy
DROP POLICY IF EXISTS "Acceso Total Saldos" ON public.saldos;

-- planificacion: Remove public ALL + public read + service_role policies
DROP POLICY IF EXISTS "Acceso Total Planificacion" ON public.planificacion;
DROP POLICY IF EXISTS "public_read_planificacion" ON public.planificacion;
DROP POLICY IF EXISTS "service_role_full_access" ON public.planificacion;

-- dias: Remove public ALL policy
DROP POLICY IF EXISTS "Acceso Total Dias" ON public.dias;

-- turnos: Remove public ALL policies and public read
DROP POLICY IF EXISTS "Acceso Total Turnos" ON public.turnos;
DROP POLICY IF EXISTS "Acceso Total Service Role" ON public.turnos;
DROP POLICY IF EXISTS "Lectura Pública" ON public.turnos;
