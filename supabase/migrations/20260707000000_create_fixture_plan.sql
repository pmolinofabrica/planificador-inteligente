CREATE TABLE IF NOT EXISTS fixture_plan (
  id_fixture SERIAL PRIMARY KEY,
  id_dispositivo INTEGER NOT NULL REFERENCES dispositivos(id_dispositivo),
  fecha DATE NOT NULL,
  tipo_turno TEXT NOT NULL,
  prioridad INTEGER NOT NULL DEFAULT 1,
  residente1 INTEGER,
  residente2 INTEGER,
  asignado TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(id_dispositivo, fecha, tipo_turno)
);

ALTER TABLE fixture_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer fixture_plan"
  ON fixture_plan FOR SELECT
  USING (true);

CREATE POLICY "Todos pueden insertar fixture_plan"
  ON fixture_plan FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Todos pueden actualizar fixture_plan"
  ON fixture_plan FOR UPDATE
  USING (true);

CREATE POLICY "Todos pueden eliminar fixture_plan"
  ON fixture_plan FOR DELETE
  USING (true);
