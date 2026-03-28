
-- 1. Eliminar el trigger y la función obsoleta de tardanzas que usan la columna 'tipo'
DROP TRIGGER IF EXISTS trg_control_tardanzas ON public.inasistencias;
DROP FUNCTION IF EXISTS public.procesar_tardanzas();

-- 2. Actualizar la función auto_requiere_certificado para imprevistos
CREATE OR REPLACE FUNCTION public.func_auto_requiere_certificado()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.requiere_certificado IS NULL THEN
        IF NEW.motivo IN ('medico', 'estudio', 'otro_justificada') THEN
            NEW.requiere_certificado := TRUE;
            NEW.estado := 'pendiente';
        ELSIF NEW.motivo = 'imprevisto' THEN
            NEW.requiere_certificado := FALSE;
            NEW.estado := 'pendiente';
        ELSE
            NEW.requiere_certificado := FALSE;
            NEW.estado := 'injustificada';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 3. Actualizar la función func_update_requiere_certificado para imprevistos
CREATE OR REPLACE FUNCTION public.func_update_requiere_certificado()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.motivo IN ('medico', 'estudio', 'otro_justificada') THEN
        NEW.requiere_certificado := TRUE;
    ELSIF NEW.motivo = 'imprevisto' THEN
        NEW.requiere_certificado := FALSE;
    ELSE
        NEW.requiere_certificado := FALSE;
    END IF;
    RETURN NEW;
END;
$$;
