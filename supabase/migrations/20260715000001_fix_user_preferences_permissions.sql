-- Faltaba el GRANT para que el rol authenticated pueda acceder a la tabla.
-- Sin esto, PostgreSQL deniega todo acceso a nivel tabla antes de evaluar RLS.

GRANT ALL ON TABLE public.user_preferences TO authenticated;
