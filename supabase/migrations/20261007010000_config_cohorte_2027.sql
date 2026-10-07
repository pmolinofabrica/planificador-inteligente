-- Añade la cohorte 2027 a config_cohorte y deja un solo año activo.
--
-- La app leía `config_cohorte.cohorte_activa`, columna que no existe (la tabla
-- usa `anio`), así que getActiveCohorte caía al catch y devolvía el año del
-- reloj. Con esta fila, la cohorte activa pasa a ser un dato de configuración
-- y no una suposición del calendario.
--
-- Se cierra 2025 y 2026 porque "activo" debe significar "el año en curso": con
-- dos o tres años en true no hay forma de elegir sin una regla extra.

BEGIN;

-- Cohorte 2027: mismo patrón de fechas que 2026 (15-feb a 31-dic).
INSERT INTO config_cohorte (anio, fecha_inicio, fecha_fin, horas_semanales_requeridas, activo)
VALUES (2027, DATE '2027-02-15', DATE '2027-12-31', 12, true)
ON CONFLICT (anio) DO UPDATE
    SET fecha_inicio = EXCLUDED.fecha_inicio,
        fecha_fin = EXCLUDED.fecha_fin,
        horas_semanales_requeridas = EXCLUDED.horas_semanales_requeridas;

-- Solo 2027 queda activo. 2025 y 2026 quedan como histórico consultable.
UPDATE config_cohorte SET activo = (anio = 2027);

COMMIT;

-- Verificación
SELECT anio, fecha_inicio, fecha_fin, horas_semanales_requeridas, activo
FROM config_cohorte ORDER BY anio;