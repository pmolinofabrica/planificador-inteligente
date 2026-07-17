-- Tablero de incidencias (Scrum-like board)
-- 5 usuarios: Pablo (dev), Vane, Celi, Euge, Eli
-- Sin relación con auth.users ni datos_personales

CREATE TABLE IF NOT EXISTS tablero_usuarios (
  nombre TEXT PRIMARY KEY,
  es_desarrollador BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO tablero_usuarios (nombre, es_desarrollador) VALUES
  ('Pablo', true),
  ('Vane', false),
  ('Celi', false),
  ('Euge', false),
  ('Eli', false)
ON CONFLICT (nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS tablero_items (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  tipo TEXT NOT NULL CHECK (tipo IN ('fallo', 'mensaje', 'propuesta')),
  estado TEXT NOT NULL DEFAULT 'pendiente'
      CHECK (estado IN ('pendiente', 'en_progreso', 'feedback', 'resuelto', 'cerrado')),
  autor_nombre TEXT NOT NULL REFERENCES tablero_usuarios(nombre),
  app TEXT NOT NULL DEFAULT 'asignaciones',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tablero_items_app ON tablero_items(app);

CREATE TABLE IF NOT EXISTS tablero_comentarios (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES tablero_items(id) ON DELETE CASCADE,
  autor_nombre TEXT NOT NULL REFERENCES tablero_usuarios(nombre),
  contenido TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Permitir acceso a las tablas del tablero
-- anon: cuando no hay sesión activa (usuario nunca logueado)
-- authenticated: cuando hay sesión activa (usuario logueado en otra app del mismo proyecto)
GRANT ALL ON TABLE tablero_usuarios TO anon, authenticated;
GRANT ALL ON TABLE tablero_items TO anon, authenticated;
GRANT ALL ON TABLE tablero_comentarios TO anon, authenticated;
GRANT USAGE ON SEQUENCE tablero_items_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE tablero_comentarios_id_seq TO anon, authenticated;
