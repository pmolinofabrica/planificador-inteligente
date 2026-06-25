CREATE TABLE IF NOT EXISTS public.refuerzos_asignaciones (
  id_refuerzo SERIAL PRIMARY KEY,
  id_agente INTEGER NOT NULL REFERENCES public.datos_personales(id_agente) ON DELETE CASCADE,
  id_dispositivo INTEGER NOT NULL REFERENCES public.dispositivos(id_dispositivo) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  id_turno INTEGER REFERENCES public.turnos(id_turno) ON DELETE CASCADE,
  numero_grupo SMALLINT CHECK (numero_grupo >= 1 AND numero_grupo <= 3),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (id_agente, fecha)
);

ALTER TABLE public.refuerzos_asignaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_refuerzos_asignaciones"
  ON public.refuerzos_asignaciones
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_write_refuerzos_asignaciones"
  ON public.refuerzos_asignaciones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
