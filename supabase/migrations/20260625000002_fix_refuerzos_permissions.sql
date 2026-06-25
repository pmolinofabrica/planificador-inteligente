-- Fix permissions for refuerzos_asignaciones table and its sequence
GRANT ALL ON TABLE public.refuerzos_asignaciones TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.refuerzos_asignaciones_id_refuerzo_seq TO authenticated;
