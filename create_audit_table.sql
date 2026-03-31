CREATE TABLE IF NOT EXISTS public.auditoria_calendario (
    id SERIAL PRIMARY KEY,
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    operacion VARCHAR(10) NOT NULL,
    usuario_db VARCHAR(50),
    esquema_tabla VARCHAR(50),
    nombre_tabla VARCHAR(50),
    registro_id VARCHAR(100), -- puede ser compuesto (ej. fecha + id_turno + id_dispositivo)
    datos_anteriores JSONB,
    datos_nuevos JSONB
);

-- Grant permissions if necessary
GRANT ALL ON public.auditoria_calendario TO authenticated;
GRANT ALL ON public.auditoria_calendario TO service_role;
