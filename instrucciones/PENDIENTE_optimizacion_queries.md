# PENDIENTE: Optimización Avanzada de Queries

**Prioridad:** Media
**Impacto:** Reducción de datos transferidos desde Supabase
**Riesgo:** Medio (requiere testing exhaustivo antes de merge)

---

## Hecho: corrección del truncamiento silencioso a 1000 filas

PostgREST corta toda respuesta en 1000 filas (config `max-rows`). **Un `.limit(5000)` no evade ese tope**: la petición sigue volviendo truncada a 1000 y no hay ningún error visible. Esto ya se corrigió con el helper `fetchAllRows` de `src/lib/supabase-pagination.ts`, que pagina con `.range()` ordenando por PK.

Verificado contra la base real (2026):

| Consulta | Antes | Ahora |
|----------|-------|-------|
| `capacitaciones_participantes` | 1000 de 1048 | 1048 |
| `capacitaciones_dispositivos` | 71 de 71 | 71 |
| `planificacion` | 793 de 793 | 793 |
| `menu` (apertura, dashboard) | 1000 de 1708 | 1708 |
| `menu_semana` (T/M, dashboard) | 1000 de 1656 | 1656 |
| `vista_convocatoria_completa` | 1000 de 5892 | 5892 |

`vista_convocatoria_completa` era la más grave: las 1000 filasopalaban solo febrero-abril, así que los estados de inasistencia/convocatoria/descanso no aparecían de mayo en adelante.

## Pendiente: filtros de año (reducción de bytes, no corrección)

Las consultas anteriores ya traen **todos** los datos. Filtrar por año reduciría lo transferido, pero hoy no es un bug: son diferencias de rendimiento, no de correctitud.

| Tabla | situation actual | Filter proposed |
|-------|------------------|------------------|
| `capacitaciones_participantes` | paginada, todo el historial | ligar a lasRealm de capacitaciones del año |
| `capacitaciones_dispositivos` | paginada, todo el historial | ligar a las capacitaciones del año |
| `planificacion` | paginada, todo el historial | filtrar por `dias` del año |
| `convocatoria` | se accede vía RPC y vista | ya filtrado por `anio` |

Nota: el `.limit(1)` de `AperturaDevicesPanel.tsx:297` sí es correcto ahí, busca una sola fila porPk filtrada.

## Solución Propuesta

Una vez que `dias` ya está filtrado por año, se puede filtrar `capacitaciones` ligándolo a los `diasIds` obtenidos:

```typescript
// En useAssignmentData.ts, luego de obtener diasData filtrada:
const diasIds = (diasData || []).map(d => d.id_dia);

// Reemplazar la query de capacitaciones:
supabase.from('capacitaciones')
  .select('id_cap, id_dia, id_turno, grupo')
  .in('id_dia', diasIds),  // Solo caps del año actual

// Reemplazar capacitaciones_participantes:
supabase.from('capacitaciones_participantes')
  .select('id_cap, id_agente, asistio')
  .in('id_cap', capsDesteAnio),  // Requiere 2 pasos o RPC

// Para convocatoria, filtrar por planificacion del año:
supabase.from('convocatoria')
  .select('id_convocatoria, id_agente, id_plani')
  .eq('estado', 'vigente')
  .in('id_plani', filteredPlaniIds)  // Mover el filtro al servidor
```

## Alternativa: RPC para datos del año

Ver propuesta en `AGENT_INSTRUCTIONS.md` → Tarea 3: `rpc_get_datos_planificacion(anio, mes)`.
Centraliza el filtrado en Postgres, reduciendo roundtrips y bytes transferidos.

## Cuándo priorizar

- Si la app empieza a ser lenta al cargar datos
- Si el número de registros supera 3.000 en alguna tabla
- Si Supabase reporta alto uso del plan gratuito

## Advertencia

La query de `capacitaciones_participantes` y `convocatoria` están entrelazadas con la lógica del `buildResidentCaps` y el cruce de convocatorias. Cualquier cambio en estas queries debe validarse contra el comportamiento del motor de asignación.

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

Cuando se retome el motor: envolver con `fetchAllRows` (o su equivalente en
Deno), ordenar por `id_menu`, y decidir si debe deduplicar igual que el dashboard
para que ambos coincidan.
