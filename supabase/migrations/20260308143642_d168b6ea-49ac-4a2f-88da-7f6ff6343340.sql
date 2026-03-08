
-- Fix: All RLS policies are RESTRICTIVE (no permissive policy exists = no access).
-- Drop restrictive policies and recreate as PERMISSIVE for authenticated users.

-- Helper: tables with read-only restrictive policies
DO $$
DECLARE
  t TEXT;
  pol TEXT;
BEGIN
  -- Drop all existing restrictive SELECT policies and recreate as permissive
  FOR t, pol IN
    SELECT tablename::text, policyname::text
    FROM pg_policies
    WHERE schemaname = 'public'
      AND permissive = 'RESTRICTIVE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
  END LOOP;
END $$;

-- Now create PERMISSIVE policies for all key tables

-- Read-only tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'agentes_grupos_dias', 'ajustes_horas', 'cambio_transaccion', 
    'cambio_transaccion_detalle', 'cambio_validacion',
    'capacitaciones', 'capacitaciones_dispositivos', 'capacitaciones_participantes',
    'certificados', 'config_ciclo_lectivo', 'config_cohorte',
    'configuracion', 'descansos', 'disponibilidad', 'dispositivos',
    'error_patterns', 'menu_semana', 'solicitudes', 'stg_calendario_import',
    'system_errors', 'tardanzas', 'visitas_grupales'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "permissive_read_%s" ON public.%I FOR SELECT TO authenticated USING (true)',
      t, t
    );
  END LOOP;
END $$;

-- Read-write tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'asignaciones', 'calendario_dispositivos', 'convocatoria',
    'datos_personales', 'datos_personales_adicionales', 'dias',
    'inasistencias', 'menu', 'planificacion', 'saldos', 'turnos'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "permissive_read_%s" ON public.%I FOR SELECT TO authenticated USING (true)',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "permissive_write_%s" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t, t
    );
  END LOOP;
END $$;
