# Optimización de queries: estado

## Hecho: filtro por año en servidor

Las cuatro tablas cuelgan de `dias` y ahora se acotan al año en cascada
(`dias → capacitaciones → participantes/dispositivos`), implementado en
`src/lib/year-scoped-data.ts`. El detalle completo, incluido por qué no se puede
usar `!inner` sobre `dias`, está en `ROTACION_COHORTE.md`.

Al abrir la cohorte 2027 sobre la misma base esto dejó de ser una optimización:
las capacitaciones de 2026 se cruzaban con los agentes de 2027 en
`buildResidentCaps`.

## Hecho: corrección del truncamiento silencioso a 1000 filas

PostgREST corta toda respuesta en 1000 filas (config `max-rows`). **Un
`.limit(5000)` no evade ese tope**: la petición sigue volviendo truncada a 1000
y no hay ningún error visible. Corregido con el helper `fetchAllRows` de
`src/lib/supabase-pagination.ts`, que pagina con `.range()` ordenando por PK.

Verificado contra la base real (2026):

| Consulta | Antes | Ahora |
|----------|-------|-------|
| `capacitaciones_participantes` | 1000 de 1048 | 1048 |
| `capacitaciones_dispositivos` | 71 de 71 | 71 |
| `planificacion` | 793 de 793 | 793 |
| `menu` (apertura, dashboard) | 1000 de 1708 | 1708 |
| `menu_semana` (T/M, dashboard) | 1000 de 1656 | 1656 |
| `vista_convocatoria_completa` | 1000 de 5892 | 5892 |

`vista_convocatoria_completa` era la más grave: las 1000 filas Reach solo
febrero-abril, así que los estados de inasistencia/convocatoria/descanso no
aparecían de mayo en adelante.

## Pendiente: nada que bloquee

No queda ningún `.limit()` 用于 evadir el tope de 1000 filas. Las tablas grandes
ya están paginadas y acotadas por año.

Queda como mejora opcional el mover más lógica a Postgres (un RPC que devuelva
el mes ya filtrado) para reducir roundtrips. Today son 5 consultas paralelas por
carga de mes; con volumen real de varios años esto empieza a importar, pero hoy
no es un problema. Propuesta histórica en `AGENT_INSTRUCTIONS.md` → Tarea 3.

---

# PENDIENTE: paginación en el motor de auto-asignación

**Prioridad:** Baja (el motor no está en uso)
**Riesgo:** Medio

`supabase/functions/motor-asignacion-apertura/index.ts:255` carga el historial
del año con una sola consulta sin paginar:

```typescript
const { data: menuPrevio } = await supabase
  .from("menu")
  .select("id_agente, id_dispositivo, fecha_asignacion")
  .gte("fecha_asignacion", anioInicio)
  .lte("fecha_asignacion", anioFin);
```

Con `menu` en 1708 filas para 2026, el motor opera sobre las primeras 1000 y
pierde ~40% del histórico al calcular `localRepeat` y `globalLoad`. Además no
deduplica por día ni lee `menu_semana`, a diferencia del dashboard.

Cuando se retome el motor: paginar con `.range()` ordenando por `id_menu` (el
helper `fetchAllRows` es de `src/lib`, no se puede importar directo en Deno:
copiar la lógica), y decidir si debe deduplicar igual que el dashboard para que
ambos coincidan.

Ojo al retomar: el motor calcula equidad anual, así que unlike el planificador
**no** debe filtrar por cohorte ni descartar años previos. Necesita el
histórico completo para repartir carga justamente.