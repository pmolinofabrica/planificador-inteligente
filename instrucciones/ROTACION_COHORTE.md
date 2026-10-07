# Rotación de cohorte: qué hay que hacer cada año

La app toma la cohorte de `config_cohorte` (la fila con `activo = true`), no del
reloj. Cuando abrís la cohorte nueva y cerrás la anterior, el resto se acomoda
solo: no hay año hardcodeado en el código.

## Rotación anual

Corre esto cuando abras la cohorte nueva (enero de 2027 para el ciclo 2027):

```sql
-- 1. Cerrar la cohorte anterior
UPDATE datos_personales
   SET activo = false
 WHERE cohorte = 2026;

-- 2. Marcar la cohorte nueva como activa en la configuración
UPDATE config_cohorte SET activo = (anio = 2027);
```

El paso 1 es tu decisión de negocio: cuándo se da de baja a los residentes. El paso
2 habilita la fila de 2027 en `config_cohorte`, que ya está creada.

**Orden importa:** cerrá la cohorte vieja antes de que empiece a cargar
capacitaciones de la nueva. Si queda un agente viejo activo y aparece una
capacitación nueva, el conteo los mezcla.

## Qué pasa automáticamente

Al cambiar `config_cohorte`:

| Componente | Comportamiento |
|---|---|
| `getActiveCohorte` | Lee el año activo de `config_cohorte`, con fallback al año del reloj |
| `useAssignmentData` | Pide los residentes de esa cohorte y carga capacitaciones/planificación acotadas al año |
| `DashboardRotacion` | Muestra la cohorte configurada, no la del calendario |

Navegar entre meses de un año distinto vuelve a leer los datos: el caché está
scopeado por año (ver `StaticCache.year` en `useAssignmentData.ts`). Antes solo
se invalidaba con "Sincronizar", así que cambiar de año servía datos del
anterior sin avisar.

Si cambiás la cohorte con la app abierta, tocá **Sincronizar**: ahí se
invalida también el caché de cohorte.

## Datos que hay que tener cargados

`dias` es la base de todo: `planificacion`, `capacitaciones` y `convocatoria`
cuelgan de `id_dia`. **Sin los días del año nuevo no se puede planificar ni
convocar.**

2025, 2026 y 2027 ya están cargados (365 días cada uno). Para años siguientes:

```sql
INSERT INTO dias (fecha, dia, mes, anio, numero_dia_semana, es_feriado, descripcion_feriado)
SELECT d::date,
       EXTRACT(day   FROM d)::int,
       EXTRACT(month FROM d)::int,
       EXTRACT(year  FROM d)::int,
       EXTRACT(dow   FROM d)::int,   -- 0 = domingo
       false, NULL
  FROM generate_series('2028-01-01'::date, '2028-12-31'::date, '1 day') AS d
ON CONFLICT (fecha) DO NOTHING;
```

Los feriados se marcan aparte con `es_feriado = true`. 2025 tiene 8 marcados
(cuyas vacaciones de julio); 2026 y 2027 están sin marcar, como estaban antes de
este trabajo.

## Aislamiento entre años

Las capacitaciones, participantes, dispositivos por capacitación y planificación
se filtran por año **en el servidor**, en cascada:

```
dias(año) → capacitaciones(id_dia) → participantes(id_cap) / dispositivos(id_cap)
```

No se puede hacer con un `!inner` sobre `dias` porque esas tablas no declaran la
FK hacia `dias`, así que PostgREST responde "Could not find a relationship".

Esto importa a partir de 2027: con dos años de capacitaciones en la misma base,
`buildResidentCaps` cruzaba capacitaciones de 2026 con los agentes de 2027 y los
conteos de capacitación salían mezclados. Verificado: cero participantes de
2027 que provengan de capacitaciones de 2026.

## Si algo se ve raro

Revisá en este orden:

1. `SELECT * FROM config_cohorte ORDER BY anio;` — ¿hay un solo `activo = true`?
   Si hay varios, la app toma el más alto.
2. `SELECT anio, count(*) FROM dias GROUP BY 1;` — ¿está el año?
3. Si la cohorte cambió con la app abierta, tocá **Sincronizar**.