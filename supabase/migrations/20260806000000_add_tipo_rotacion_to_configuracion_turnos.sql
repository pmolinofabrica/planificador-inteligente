ALTER TABLE configuracion_turnos
  ADD COLUMN IF NOT EXISTS tipo_rotacion TEXT DEFAULT NULL;

COMMENT ON COLUMN configuracion_turnos.tipo_rotacion IS
  'Modalidad de rotación: ''rotacion simple'' o ''dispositivo fijo''. '
  'Regla sugerida: desde la primera fecha en que el residente aparece en dispositivos = rotación simple; hacia atrás = dispositivo fijo.';
