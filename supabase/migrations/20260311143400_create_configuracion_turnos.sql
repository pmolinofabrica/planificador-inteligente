-- 1. Create table
CREATE TABLE IF NOT EXISTS public.configuracion_turnos (
    fecha date NOT NULL,
    id_turno integer NOT NULL,
    tipo_organizacion character varying(50) NOT NULL DEFAULT 'dispositivos fijos',
    CONSTRAINT pk_configuracion_turnos PRIMARY KEY (fecha, id_turno),
    CONSTRAINT fk_config_turnos FOREIGN KEY (id_turno) REFERENCES turnos(id_turno) ON DELETE RESTRICT,
    CONSTRAINT chk_config_tipo_org CHECK (tipo_organizacion::text = ANY (ARRAY['dispositivos fijos'::varchar, 'rotacion simple'::varchar, 'rotacion completa'::varchar]::text[]))
);

-- 2. Enable RLS and setup policies
ALTER TABLE public.configuracion_turnos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_configuracion" ON public.configuracion_turnos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_write_configuracion" ON public.configuracion_turnos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Data Migration: Extract distinct settings from existing menu_semana
INSERT INTO public.configuracion_turnos (fecha, id_turno, tipo_organizacion)
SELECT DISTINCT fecha_asignacion, id_turno, tipo_organizacion 
FROM public.menu_semana
WHERE tipo_organizacion IS NOT NULL
ON CONFLICT (fecha, id_turno) DO NOTHING;
