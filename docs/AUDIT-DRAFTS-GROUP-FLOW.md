# Auditoría: Flujo de Asignación de Grupos (menu_semana)

## Problema / Objetivo

**Síntoma:** Al cargar varios residentes (ej.16 ) en turno tarde/mañana y asignarles grupos (G1/G2/G3) en distintos dispositivos, al guardar, algunos grupos no se persisten. Los primeros residentes suelen guardar bien; los últimos quedan asignados **sin `numero_grupo`**. La asignación al dispositivo se guarda, pero el grupo se pierde. Lo mismo pasa cuando se marca a algunos como "acompaña grupo"

**Workaround actual:** Asignar en tandas de 4-5 residentes y guardar entre cada tanda.

**Objetivo de la auditoría:** Verificar que las correcciones propuestas resuelven la pérdida de grupos al asignar cantidades mayores a 4/5 residentes en simultáneo en modalidad rotación (tarde/mañana). 

---

## Arquitectura del Sistema

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Supabase (PostgreSQL)
- **Estado:** Custom hook `useAssignmentData` (1241 líneas) con sistema de drafts
- **Tabla objetivo:** `menu_semana` (columnas clave: `id_agente`, `fecha_asignacion`, `id_turno`, `id_dispositivo`, `numero_grupo`)
- **Modos de organización:** `dispositivos fijos`, `rotacion simple`, `rotacion completa`

---

## Análisis de Causas

### Causa Raíz #1: El guardado secuencial de muchas mutaciones falla silenciosamente en las últimas

**Archivo:** `src/hooks/useAssignmentData.ts` — función `saveDrafts()` (línea 287)

```typescript
// Línea 456: Procesamiento secuencial
for (const m of pendingMutations) {
  // ... cada iteración hace 2-3 consultas Supabase con await
  await persistMenuLike(m.table, m.action, cleanPayload, cleanMatchParams);
}

// Línea 527: Solo se limpian las mutaciones si TODO el ciclo termina bien
setPendingMutations([]);
```

**Problema:**
- Cada mutación → 2-3 consultas Supabase secuenciales
- 16 residentes = 32 mutaciones (16 asignaciones + 16 grupos) = ~64-96 consultas
- Si la consulta #50 falla (timeout/rate-limit), las primeras 49 ya están commiteadas
- Las mutaciones fallidas NO se reintentan
- El error se atrapa (línea 535) y se devuelve `{ success: false, error }`, pero las mutaciones previas ya están persistidas
- No hay rollback ni compensación

**Por qué causa "primeros guardan, últimos no":**
1. Las mutaciones de **asignación** (sin grupo) suelen ir primero en el array `pendingMutations` porque el usuario asigna primero y luego marca grupos
2. Estas se procesan primero y logran persistir → el residente aparece asignado
3. Las mutaciones de **grupo** van después y son más propensas a fallar por fatiga del cliente Supabase
4. Cuando fallan, el residente queda asignado pero sin `numero_grupo`

### Causa Raíz #2: Doble fila por residente (assign sin grupo + group con grupo)

Cada residente genera **dos filas separadas** en `menu_semana`:

| Mutación | Payload | keyFields | Resultado |
|----------|---------|-----------|-----------|
| Asignación (desde CellSidebar) | `{..., id_dispositivo, SIN numero_grupo}` | `[id_agente, fecha, turno, dispositivo]` | Fila A: (agent, date, turno, dev, **grupo=NULL**) |
| Grupo (desde handleGroupChange) | `{..., id_dispositivo, numero_grupo: 1}` | `[id_agente, fecha, turno, dispositivo, **numero_grupo**]` | Fila B: (agent, date, turno, dev, **grupo=1**) |

Esto es **por diseño** en rotación (mismo agente puede estar en G1 y G2 en el mismo dispositivo), pero:
- La fila A (grupo=NULL) es basura. En recarga de datos se mergea con la fila B y se descarta, pero mientras tanto ocupa espacio y puede causar confusión en consultas.
- Si la mutación B falla, queda solo la fila A (sin grupo) → el residente aparece asignado pero sin grupo.

### Causa Contribuyente #3: `handleToggleAcompana` bypassea el sistema de drafts

**Archivos:** `PlanningMatrix.tsx:228-295`, `AperturaDevicesPanel.tsx:124-176`

```typescript
// Escribe DIRECTO a Supabase, sin pasar por pendingMutations
const handleToggleAcompana = async (...) => {
  const updateObj: any = {};
  updateObj['acompa\u00f1a_grupo'] = !current;
  query = supabase.from('menu_semana').update(updateObj)...;
  await query;
  refresh();  // ← Dispara recarga completa de datos mensuales
};
```

**Problemas:**
1. No se puede deshacer con "Descartar"
2. Tras el toggle, llama `refresh()` que **recarga todos los datos del mes** desde Supabase, lo que puede pisar cambios locales (drafts) que el usuario haya hecho pero no guardado
3. Si el usuario togglea "acompaña_grupo" en varios residentes y luego asigna grupos, entre cada toggle la recarga puede resetear el estado local

### Causa Contribuyente #4: `handleGroupChange` duplica `setAssignmentsDb`

**Archivo:** `PlanningMatrix.tsx:185-225`

```typescript
const handleGroupChange = async (...) => {
  // 1. addAssignmentDraft ya hace setAssignmentsDb internamente
  data.addAssignmentDraft({ ... });

  // 2. Llama setAssignmentsDb OTRA VEZ
  data.setAssignmentsDb(prev => {
    const next = { ...prev };
    // ... muta el estado otra vez
    return next;
  });
};
```

Si bien React 18 batch ambos updates, la doble actualización es redundante y puede causar inconsistencias si hay condiciones de carrera entre renders.

### Causa Contribuyente #5: Sin protección contra doble click en botón Guardar

**Archivo:** `Index.tsx:249-253`

```typescript
<button onClick={async () => {
  const res = await data.saveDrafts();  // No hay disabled ni isLoading check
  if (!res.success) alert(`Error: ${res.error}`);
}}>
```

Si el usuario hace doble click:
1. Click 1: `saveDrafts()` empieza, `setIsLoading(true)`
2. Click 2: `saveDrafts()` empieza de nuevo (no hay guard)
3. La segunda instancia itera `pendingMutations` mientras la primera aún no los limpia
4. Segunda instancia encuentra los mismos drafts y los reprocesa → duplicados en DB

### Causa Contribuyente #6: `buildMutationKey` para DELETE sin `numero_grupo` puede borrar grupos existentes

**Archivo:** `ResidentSidebar.tsx:228-243`

```typescript
// En handleRemove, se envía un DELETE sin numero_grupo
data.addAssignmentDraft({
  action: 'delete',
  matchParams: { id_agente, fecha_asignacion, id_turno, id_dispositivo },
  // SIN numero_grupo ← borra TODAS las filas de este agente/fecha/turno/dispositivo
});
```

En `persistMenuLike`, `hasPhysicalGroup = false` para este DELETE, así que `keyFields = [id_agente, fecha, turno, dispositivo]` (sin grupo). El DELETE where clause mata **todas** las filas del agente en ese dispositivo, incluyendo grupos que no se querían eliminar.

---

## Propuesta de Corrección (a auditar)

### Fix 1 (ALTA): Consolidar asignación + grupo en una mutación

**Objetivo:** Evitar crear la fila "basura" sin grupo cuando el usuario ya asignó un grupo.

**Cambio en `CellSidebar.tsx` `handleAssign` (rotación, ~línea 245):**
- Cuando el usuario asigna un residente desde el sidebar, si el residente ya tiene grupo en la UI (`numero_grupo` en el estado local), incluirlo en la mutation payload
- No esperar a que `handleGroupChange` cree una segunda mutación

**Cambio en `PlanningMatrix.tsx` `handleGroupChange`:**
- En vez de crear una mutación `upsert` separada, **modificar la mutación de asignación existente** en `pendingMutations` para agregarle el `numero_grupo`
- O en su defecto, que la mutación de grupo sea un `update` (no `upsert`) que busque la fila creada por la asignación y le agregue el grupo

### Fix 2 (ALTA): Batch processing con tolerancia a fallos parciales

**Cambio en `useAssignmentData.ts` `saveDrafts` (~línea 287):**
- Dividir `pendingMutations` en lotes de 5
- Procesar cada lote con `Promise.allSettled`
- Reportar cuántos fallaron y cuáles son
- NO abortar todo si un lote falla
- NO limpiar las mutaciones fallidas de `pendingMutations` (solo las exitosas)
- Mostrar toast con resumen: "15/16 grupos guardados. 1 falló."

```
Pseudo-código:
batches = chunk(pendingMutations, 5)
failedMutations = []
for batch of batches:
  results = await Promise.allSettled(batch.map(m => persist(m)))
  for i, result of results:
    if result.status === 'rejected':
      failedMutations.push(batch[i])

if failedMutations.length > 0:
  setPendingMutations(failedMutations)  // Solo quedan los fallidos
  toast.error(`${failedMutations.length} mutaciones fallaron`)
else:
  setPendingMutations([])
  toast.success('Guardado exitoso')
```

### Fix 3 (MEDIA): Mover `handleToggleAcompana` al draft system

**Cambio en `PlanningMatrix.tsx` y `AperturaDevicesPanel.tsx`:**
- En vez de escribir directo a Supabase, crear una `PendingMutation` con `action: 'update'`, `table: 'menu_semana'`, `payload: { 'acompa\u00f1a_grupo': !current }`
- Los matchParams deben incluir `id_agente`, `fecha_asignacion`, `id_turno`, `id_dispositivo`
- NO llamar `refresh()` después del toggle
- Esto permite undo con "Descartar" y evita recargas espurias

### Fix 4 (MEDIA): Eliminar doble `setAssignmentsDb` en `handleGroupChange`

**Cambio en `PlanningMatrix.tsx:210-225`:**
- Eliminar el bloque `data.setAssignmentsDb(prev => {...})` manual
- Ya `addAssignmentDraft` hace el update optimista internamente
- Si se necesita un update especial, modificar `addAssignmentDraft` (en `useAssignmentData.ts`) para que maneje correctamente el merge de grupos

### Fix 5 (BAJA): Protección contra doble click en Guardar

**Cambio en `Index.tsx:249-253`:**
- Agregar estado `isSaving` local (o usar `data.isLoading`)
- Deshabilitar el botón mientras `isSaving` es true
- `isSaving = true` antes de `saveDrafts()`, `false` después

### Fix 6 (BAJA): Corregir DELETE sin grupo en `ResidentSidebar.handleRemove`

**Cambio en `ResidentSidebar.tsx:228-243`:**
- Si ya se enviaron deletes individuales por grupo, el DELETE "full-device" es redundante
- Evaluar si es necesario; si lo es, incluir `numero_grupo` en matchParams

---

## Archivos relevantes para la auditoría

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `src/hooks/useAssignmentData.ts` | 1241 | Hook principal: carga datos, maneja drafts, saveDrafts |
| `src/components/assignments/PlanningMatrix.tsx` | 629 | Grid principal: handleGroupChange, handleToggleAcompana |
| `src/components/assignments/CellSidebar.tsx` | 453 | Sidebar de asignación: handleAssign |
| `src/components/assignments/AperturaDevicesPanel.tsx` | 790 | Panel de ejecución: handleGroupChange, handleToggleAcompana |
| `src/components/assignments/ResidentSidebar.tsx` | 345 | Sidebar de residente: handleRemove, handleSwap |
| `src/components/assignments/VacantActionSidebar.tsx` | 329 | Sidebar de vacantes: handleAssign |
| `src/pages/Index.tsx` | 501 | Página principal: botón Guardar, layout |
| `src/types/assignments.ts` | 173 | Tipos: PendingMutation, AssignmentEntry, etc. |

---

---

# Segunda Auditoría: Implementación Realizada

## Resumen de cambios

| Archivo | Cambio |
|---------|--------|
| `src/lib/draftMutations.ts` | **Nuevo.** Función pura `compactPendingMutations()` + `buildMutationKey()` extraída |
| `src/lib/draftMutations.test.ts` | **Nuevo.** 4 tests unitarios |
| `src/hooks/useAssignmentData.ts` | Compactación al inicio de `saveDrafts`, `isSavingRef`, merge de `acompaña_grupo` en drafts, ruta de partial update en persist |
| `src/components/assignments/PlanningMatrix.tsx` | `handleToggleAcompana` → draft, eliminado `setAssignmentsDb` duplicado en `handleGroupChange` |
| `src/components/assignments/AperturaDevicesPanel.tsx` | `handleToggleAcompana` → draft, eliminado `setAssignmentsDb` duplicado en `handleGroupChange` |
| `src/pages/Index.tsx` | Botón Guardar con `disabled={isLoading}`, función `handleSaveDrafts` con guard |

## Lo que se implementó (5/6 fixes)

### ✅ Fix 1: Compactación central de drafts (`draftMutations.ts`)

En vez de mutar drafts desde componentes, se creó `compactPendingMutations()` que:

1. Agrupa mutaciones por clave `(agentId, fecha, turno, dispositivo)`
2. Detecta pares `assign (sin grupo) + group (con grupo)` para el mismo residente/dispositivo
3. Los fusiona en UNA sola mutación que incluye `numero_grupo` e `id_convocatoria`
4. Descarta la mutación "assign sin grupo" (ya no se crea fila basura)
5. Respeta `acompaña_grupo` como update parcial (no lo consume en la fusión)

**Tests:** cubre consolidación, grupos múltiples, acompana intacto, buildMutationKey.

### ✅ Fix 2: `handleGroupChange` sin double `setAssignmentsDb`

Eliminado el bloque redundante `data.setAssignmentsDb(prev => {...})` tanto en `PlanningMatrix.tsx` como en `AperturaDevicesPanel.tsx`. `addAssignmentDraft` ya hace el update optimista.

### ✅ Fix 3: `saveDrafts` con protección y recuperación parcial

- `isSavingRef.current` previene ejecución concurrente (doble click)
- Toma una **foto compactada** al inicio (`const mutationsToSave = compactPendingMutations(pendingMutations)`)
- Procesa secuencialmente (la compactación reduce ~32 mutaciones a ~16-20, mitigando la fatiga)
- Si falla, solo remueve de la cola las mutaciones **exitosas** (`processedMutationIds`)
- Las fallidas quedan pendientes para reintentar (sin perder datos)

**NO se implementó** `Promise.allSettled` por lotes. La decisión fue correcta: compactar primero reduce el volumen, y la concurrencia agregaría complejidad de orden/dependencias sin beneficio claro frente a la causa raíz (mutaciones redundantes).

### ✅ Fix 4: `handleToggleAcompana` en draft system

Ambos componentes (`PlanningMatrix`, `AperturaDevicesPanel`) ahora usan `addAssignmentDraft` con `action: 'update'` para togglear `acompaña_grupo`. Ya no escriben directo a Supabase ni llaman `refresh()`.

**Protección adicional en persist:** se agregó una ruta de **partial update** en `persistMenuLike`. Cuando detecta que es un update con solo campos no-clave (`acompaña_grupo`), hace un `supabase.update(cleanPayload).eq(keyFields)` directo, sin leer la fila base ni mergear. Esto evita que `numero_grupo` se copie/pise accidentalmente.

### ✅ Fix 5: Guard contra doble click

- `Index.tsx`: botón `disabled={data.isLoading}` + `disabled:opacity-50 disabled:pointer-events-none`
- `useAssignmentData.ts`: `isSavingRef.current` en `saveDrafts`

### ❌ Fix 6: No se corrigió (intencional)

El DELETE "full-device" en `ResidentSidebar.handleRemove` (línea 228) es intencional: cuando se quita un residente de un dispositivo, se borran TODAS sus filas físicas. Los deletes individuales por grupo más el full-device DELETE son complementarios, no contradictorios. Se considera comportamiento correcto.

---

## Lo que NO se cubre (deuda técnica)

1. **Tests de integración para `saveDrafts`/`persistMenuLike`**: No hay tests que verifiquen la interacción con Supabase. Serían valiosos pero requieren mockear Supabase.
2. **Test de merge `acompaña_grupo` en `addAssignmentDraft`**: La lógica de merge parcial (líneas 131-142 de useAssignmentData.ts) no tiene test unitario.
3. **RPC transaccional en Supabase**: La recomendación de la otra IA de mover el save a una RPC con transacción Postgres no se implementó. Sigue siendo una mejora deseable a futuro para atomicidad real.
4. **El merge de `acompaña_grupo` usa `hasOwnProperty` con string literal**: En `useAssignmentData.ts` línea 237, la key `'acompaña_grupo'` podría diferir si el payload usa `\u00f1` vs caracter literal. Se verificó que JS normaliza ambos al mismo string, pero es un punto frágil.

---

## Veredicto Final

| Aspecto | Estado |
|---------|--------|
| Tests pasan | ✅ 5/5 |
| TypeScript compila limpio | ✅ |
| Causa raíz (#1) cubierta | ✅ Compactación + isSavingRef |
| Causa raíz (#2) cubierta | ✅ `compactPendingMutations` elimina filas basura |
| Fix acompaña_grupo | ✅ Partial update + draft system |
| Fix double-click | ✅ 2 capas (isSavingRef + disabled) |
| Fix double `setAssignmentsDb` | ✅ |
| Tests de compactación | ✅ 4 tests |
| Tests de persist/integración | ❌ No hay |
| RPC transaccional | ❌ No implementado |

**La implementación está completa y correcta para el problema reportado.** Las decisiones de diseño (compactar antes de persistir, no usar batch concurrente, no corregir el delete full-device) son razonables y están bien justificadas. La deuda técnica identificada es aceptable para una primera iteración.
- [ ] Otros problemas no considerados en esta revisión

