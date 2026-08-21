-- Índice único parcial para evitar duplicados "sin grupo" en menu_semana.
--
-- Problema: en Postgres, los NULL son DISTINTOS entre sí en un índice UNIQUE.
-- La clave uq_menu_semana_asignacion (id_agente, fecha_asignacion, id_turno,
-- id_dispositivo, numero_grupo) permite DOS filas con numero_grupo = NULL en la
-- misma celda, porque NULL nunca colisiona. Eso es exactamente cómo nacían los
-- duplicados "sin grupo" (caso 2026-08-13, "sacar un residente de un dispositivo").
--
-- Solución: índice único PARCIAL que solo mira las filas sin grupo. Ahora una
-- celda puede tener varias filas siempre que cada una tenga un numero_grupo
-- DISTINTO (1, 2, 3...), pero solo UNA fila "sin grupo".
--
-- Pre-chequeo 2026-08-18: 0 celdas con >1 fila numero_grupo IS NULL → migra limpio.

CREATE UNIQUE INDEX IF NOT EXISTS uq_menu_semana_sin_grupo
  ON public.menu_semana (id_agente, fecha_asignacion, id_turno, id_dispositivo)
  WHERE numero_grupo IS NULL;