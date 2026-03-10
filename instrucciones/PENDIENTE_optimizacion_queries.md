# PENDIENTE: Optimización Avanzada de Queries en `useAssignmentData.ts`

**Prioridad:** Media  
**Impacto:** Reducción de datos transferidos desde Supabase  
**Riesgo:** Medio (requiere testing exhaustivo antes de merge)

---

## Contexto

Al cargar datos en `src/hooks/useAssignmentData.ts`, varias queries largas traen todos los registros y filtran en el cliente. El cambio mínimo aplicado (filtrar `dias` por año con `gte/lte`) reduce la carga de esa tabla, pero quedan pendientes:

## Queries que aún usan `.limit()` sin filtro de año

| Tabla | Limit actual | Problema |
|-------|-------------|---------|
| `capacitaciones_participantes` | 5000 | Trae todos los registros del historial |
| `capacitaciones_dispositivos` | 5000 | Sin filtro temporal |
| `planificacion` | 5000 | Sin filtro por año |
| `convocatoria` | 10000 | Puede superar el límite en el futuro |

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
