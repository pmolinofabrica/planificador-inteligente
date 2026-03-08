
-- Enable RLS on all critical tables that don't have policies yet
ALTER TABLE public.menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispositivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_dispositivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inasistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacitaciones_dispositivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacitaciones_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agentes_grupos_dias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ajustes_horas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_semana ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.descansos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cambio_transaccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cambio_transaccion_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cambio_validacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_calendario_import ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_ciclo_lectivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_cohorte ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas_grupales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tardanzas ENABLE ROW LEVEL SECURITY;

-- Authenticated read-only policies for operational tables
CREATE POLICY "authenticated_read_menu" ON public.menu FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_write_menu" ON public.menu FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_dispositivos" ON public.dispositivos FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_calendario" ON public.calendario_dispositivos FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_write_calendario" ON public.calendario_dispositivos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_inasistencias" ON public.inasistencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_write_inasistencias" ON public.inasistencias FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_capacitaciones" ON public.capacitaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_cap_dispositivos" ON public.capacitaciones_dispositivos FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_cap_participantes" ON public.capacitaciones_participantes FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_asignaciones" ON public.asignaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_write_asignaciones" ON public.asignaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_certificados" ON public.certificados FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_agd" ON public.agentes_grupos_dias FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_ajustes" ON public.ajustes_horas FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_menu_semana" ON public.menu_semana FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_descansos" ON public.descansos FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_disponibilidad" ON public.disponibilidad FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_cambio_trans" ON public.cambio_transaccion FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_cambio_det" ON public.cambio_transaccion_detalle FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_cambio_val" ON public.cambio_validacion FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_errors" ON public.system_errors FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_patterns" ON public.error_patterns FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_config" ON public.configuracion FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_ciclo" ON public.config_ciclo_lectivo FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_cohorte" ON public.config_cohorte FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_solicitudes" ON public.solicitudes FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_visitas" ON public.visitas_grupales FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_tardanzas" ON public.tardanzas FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_stg" ON public.stg_calendario_import FOR SELECT TO authenticated USING (true);

-- Service role bypass for edge functions (service_role bypasses RLS by default)
-- No explicit policy needed for service_role
