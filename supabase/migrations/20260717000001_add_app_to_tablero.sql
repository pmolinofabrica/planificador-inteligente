-- Agregar columna app para filtrar tablero por aplicación
-- 3 apps: 'asignaciones', 'planificacion', 'visit'

ALTER TABLE tablero_items ADD COLUMN app TEXT NOT NULL DEFAULT 'asignaciones';
CREATE INDEX idx_tablero_items_app ON tablero_items(app);

GRANT ALL ON TABLE tablero_items TO anon, authenticated;
