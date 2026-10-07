-- Carga los días del año 2027 en la tabla `dias`.
--
-- `dias` es la llave de todo el calendario: `planificacion`, `capacitaciones` y
-- `convocatoria` cuelgan de `id_dia`. Sin los días del año no se puede planificar
-- ni convocar nada.
--
-- Réplica exacta de cómo se generaron 2025 y 2026: `numero_dia_semana` es
-- EXTRACT(dow FROM fecha), con 0 = domingo. Los feriados se marcan aparte
-- (2026 y 2027 quedan sin marcar, igual que estaban antes).

INSERT INTO dias (fecha, dia, mes, anio, numero_dia_semana, es_feriado, descripcion_feriado)
SELECT
  d::date,
  EXTRACT(day   FROM d)::int,
  EXTRACT(month FROM d)::int,
  EXTRACT(year  FROM d)::int,
  EXTRACT(dow   FROM d)::int,
  false,
  NULL
FROM generate_series('2027-01-01'::date, '2027-12-31'::date, '1 day') AS d
ON CONFLICT (fecha) DO NOTHING;

-- Verificación: debe dar 365 filas y 104 fines de semana.
-- SELECT count(*) total,
--        count(*) FILTER (WHERE numero_dia_semana = EXTRACT(dow FROM fecha)::int) dow_ok,
--        count(*) FILTER (WHERE numero_dia_semana IN (0,6)) finde
--   FROM dias WHERE anio = 2027;