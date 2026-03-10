# Instrucciones de Correcciones Funcionales

## CONTEXTO DEL PROYecto

- **Framework**: Vite + React 18 + TypeScript (SPA, NO es Next.js)
- **Deployment**: Cloudflare Pages + Supabase
- **Uso**: Interno, 4-5 usuarios máximo
- **Presupuesto**: $0 (planes gratuitos - optimización es crítica)

- **No clonar el repositorio** - Trabajar con los archivos en `/tmp/planificador-inteligente/src/`

---

## PROBLEMA 1: Indicador Visual para No Capacitado (CRÍTICO)

### Ubicación del Afecta
Todas las vistas donde se mue residentes a dispositivos.

### Código Actual

LaEn `PlanningMatrix.tsx` líneas 298-321, se visualiza la nombre con color según grupo (A/B):
```typescript
<span className={`font-bold truncate max-w-[80px] text-xs ${
  absent ? 'line-through text-stone-500 opacity-60'
  : agentGroups[String(res.id)] === 'A' ? 'text-[hsl(var(--group-a-text))] border-b-2 border-[hsl(var(--group-a-accent))]'
  : agentGroups[String(res.id)] === 'B' ? 'text-[hsl(var(--group-b-text))] border-b-2 border-[hsl(var(--group-b-accent))]'
  : ''
}`}>
```

**No existe indicador visual para "no capacitado"** cuando un residente está asignado a un dispositivo pero no tiene capacitación para ese dispositivos.

```typescript
// La lógica de verificación existe:
const capDate = res.caps[deviceId];
const isCapacitado = !!capDate && capDate <= fechaDB;
```

### Implementación Requerida

**1. Crear función helper en `src/lib/floor-utils.ts`:**
```typescript
/**
 * Devuelve clases para indicar si un residente NO está capacitado para un dispositivo específico.
export const getNotCapacitadoStyle = (
  residentCaps: Record<string, string>, 
  deviceId: string, 
  fechaActual: string
): { bg: string; text: string; border: string } => {
  const capDate = residentCaps[deviceId];
  const isCapacitado = !!capDate && capDate <= fechaActual;
  
  if (!isCapacitado) {
    return {
      bg: 'bg-red-50 text-red-700 border-red-300',
      text: 'text-red-700'
      border: 'border-2 border-red-400 border-dashed'
    };
  }
  return {};
};
```

**2. Modificar `PlanningMatrix.tsx` línea ~309:**
```typescript
// ANTES:
<div className={`font-bold truncate max-w-[80px] text-xs ${
  ...
}>

// DESPUÉS:
import { getNotCapacitadoStyle } from '@/lib/floor-utils';

// En el div, agregar indicador:
<div className={`font-bold truncate max-w-[80px] text-xs flex items-center gap-1 ${
  absent ? 'line-through text-stone-500 opacity-60'
  : agentGroups[String(res.id)] === 'A' ? 'text-[hsl(var(--group-a-text))] border-b-2 border-[hsl(var(--group-a-accent))]'
  : agentGroups[String(res.id)] === 'B' ? 'text-[hsl(var(--group-b-text))] border-b-2 border-[hsl(var(--group-b-accent))]'
  : ''
}`}>
{!isAgentAbsent(res.id, date) && deviceId && (() => {
  const capInfo = allResidentsDb.find((r: any) => r.id === res.id)?.caps?.[deviceId];
  const fechaDB = `${year}-${date.split('/')[1].padStart(2, '0')}-${date.split('/')[0].padStart(2, '0')}`;
  const notCapStyle = getNotCapacitadoStyle(capInfo, deviceId, fechaDB);
  if (notCapStyle) {
    return <span className={`${notCapStyle.text} text-[9px] px-1 font-bold`}>⚠️ SIN CAP</span>;
  }
  return null;
})()}
</span>
```

**3. Modificar `ExecutionTab.tsx` líneas ~185-214:**
```typescript
// En el div del residente, agregar:
<div className={`flex flex-col gap-2 p-3 rounded-xl border transition-colors ${
  isAbsent ? 'bg-stone-50 border-stone-300 border-dashed' : 'bg-muted/30 border-border'
}`}>
  <div className="flex items-center justify-between">
    <div className="flex flex-col">
      <span className={`font-bold text-sm ${isAbsent ? 'text-stone-500 line-through opacity-70' : 'text-foreground'}`}>
        {res.name}
      </span>
      {/* AGREGAR: Indicador de no capacitado */}
      {!isAbsent && (() => {
        const resInfo = allResidentsDb.find((r: any) => r.id === res.id);
        const capDate = resInfo?.caps?.[device.id];
        const fechaDB = `${year}-${execDate.split('/')[1].padStart(2, '0')}-${execDate.split('/')[0].padStart(2, '0')}`;
        const isCapacitado = capDate && capDate <= fechaDB;
        if (!isCapacitado) {
          return (
            <span className="text-[10px] text-red-600 font-bold flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3 h-3" /> NO CAPACITADO
            </span>
          );
        }
        return null;
      })()}
      {isAbsent && <span className="text-[10px] text-stone-500 font-bold mt-0.5">MARCADO AUSENTE</span>}
    </div>
    {/* ... botón quitar ... */}
  </div>
</div>
```

**4. Modificar `CellSidebar.tsx` líneas 278-290 (current assignments):**
```typescript
// En el div de cada residente asignado actualmente:
<div key={i}
  onClick={() => {
    setSelectedResident({ id: res.id, name: res.name, score: res.score, device: selectedDevice.name, date: selectedDate });
    setSelectedDevice(null);
    setSelectedDateFilter(null);
  }}
  className={`p-2 rounded border text-xs font-bold cursor-pointer hover:ring-2 hover:ring-primary/30 flex items-center justify-between ${getRepsColor(...)}`}>
  <span className="flex items-center gap-1">
    {res.name}
    {/* AGREGAR: Indicador no capacitado */}
    {(() => {
      const resInfo = allResidentsDb.find((r: any) => r.id === res.id);
      const capDate = resInfo?.caps?.[deviceId];
      const fechaDB = `${year}-${selectedDate.split('/')[1].padStart(2, '0')}-${selectedDate.split('/')[0].padStart(2, '0')}`;
      const isCapacitado = capDate && capDate <= fechaDB;
      if (!isCapacitado) {
        return <span className="ml-1 text-[8px] text-red-600 bg-red-100 px-1 rounded font-bold">⚠️ SIN CAP</span>;
      }
      return null;
    })()}
  </span>
  {/* ... métricas ... */}
</div>
```

### Criterios de Validación
- [ ] En PlanningMatrix: se muestra "⚠️ SIN CAP" si el residente no está capacitado para ese dispositivos
- [ ] En ExecutionTab: se muestra "NO CAPACITADO" si aplica
- [ ] En CellSidebar: se muestra "⚠️ SIN CAP" en la lista de asignados
- [ ] El indicador es sutil pero visible
- [ ] No afecta el flujo de trabajo existente

- [ ] Funciona tanto en apertura como en planificación
---
## PROBLEMA 2: Colores de Grupo A/B en Apertura (CRÍTICO)
### Ubicación
`ExecutionTab.tsx` - Tab de Apertura

### Código Actual
En `PlanningMatrix.tsx` líneas 314-321, ya existe la lógica:
```typescript
<span className={`font-bold truncate max-w-[80px] text-xs ${
  absent ? 'line-through text-stone-500 opacity-60'
  : agentGroups[String(res.id)] === 'A' ? 'text-[hsl(var(--group-a-text))] border-b-2 border-[hsl(var(--group-a-accent))]'
  : agentGroups[String(res.id)] === 'B' ? 'text-[hsl(var(--group-b-text))] border-b-2 border-[hsl(var(--group-b-accent))]'
  : ''
}`}>
```

### Implementación Requerida
En `ExecutionTab.tsx`, líneas 185-214, agregar la misma lógica:

```typescript
// En el span del nombre del residente:
<span className={`font-bold text-sm ${isAbsent ? 'text-stone-500 line-through opacity-70' : 'text-foreground'}`}>
  {res.name}
</span>
```

Cambiar a:
```typescript
<span className={`font-bold text-sm flex items-center gap-1 ${
  isAbsent ? 'text-stone-500 line-through opacity-70' 
  : agentGroups[String(res.id)] === 'A' 
    ? 'text-[hsl(var(--group-a-text))] border-b-2 border-[hsl(var(--group-a-accent))]' 
  : agentGroups[String(res.id)] === 'B' 
    ? 'text-[hsl(var(--group-b-text))] border-b-2 border-[hsl(var(--group-b-accent))]' 
  : 'text-foreground'
}`}>
  {res.name}
</span>
```

**NOTA:** Requiere acceso a `agentGroups` desde `data` en ExecutionTab

```typescript
const { dbDevices, activeDates, assignmentsDb, convocadosDb,
  allResidentsDb, isAgentAbsent, getAbsenceMotivo,
  dateTurnoMap, isLoading, setIsLoading, refresh, agentGroups  // ← Agregar agentGroups
} = data;
```

### Criterios de Validación
- [ ] Los nombres se muestran con color según grupo A/B
- [ ] Misma apógica que en Planificación y Apertura
- [ ] No hay regresiones en funcionalidad
---
## PROBLEMA 3.1: Quitar Residente en Rotación (CRÍTICO)
### Ubicación
`ResidentSidebar.tsx` - función `handleRemove` líneas 134-150

### Problema Identificado
```typescript
// Línea 144 (turno tarde/mañana):
await supabase.from('menu_semana').update({ id_dispositivo: 999 })
  .eq('id_agente', selectedResident.id)
  .eq('id_dispositivo', Number(disp?.id))  // ← SOLO actualiza UN dispositivo
  .eq('fecha_asignacion', fechaDB)
  .eq('id_turno', turnoId);
```

**En rotación simple/completa, un residente puede estar asignado a MÚLTIPLES dispositivos.**
Esta consulta SOLO actualiza el dispositivo que se está visualizando actualmente,, NO todos.

### Lógica de Rotación
- **Rotación Simple**: Un residente acompaña visitantes por TODO el edificio → asignado a múltiples dispositivos (uno por piso)
- **Rotación Completa**: Igual que simple, pero hay GRUPOS. Cada residente pertenece a un grupo (1, 2 o 3)

### Implementación Requerida
```typescript
const handleRemove = async () => {
  // En rotación, preguntar si quiere quitar de TODOS los dispositivos
  if (!isApertura && isRotation) {
    const allDevices = await supabase.from('menu_semana')
      .select('id_dispositivo')
      .eq('id_agente', selectedResident.id)
      .eq('fecha_asignacion', fechaDB)
      .eq('id_turno', turnoId);
    
    const deviceCount = allDevices.data?.length || 0;
    
    if (deviceCount > 1) {
      const confirmed = await new Promise<boolean>(resolve => {
        // Mostrar diálogo personalizado
        // Por simplicidad, usar confirm:
        const ok = confirm(
          `⚠️ ${selectedResident.name} está asignado a ${deviceCount} dispositivos.\n\n¿Desea quitarlo de TODOS los dispositivos?`
        );
        resolve(ok);
      });
      
      if (!ok) return;
    }
  }
  
  setIsLoading(true);

  if (isApertura) {
    // Apertura: lógica actual (sin cambios)
    await supabase.from('menu').update({ id_dispositivo: 999 })
      .eq('id_agente', selectedResident.id)
      .eq('id_dispositivo', Number(disp?.id))
      .eq('fecha_asignacion', fechaDB);
  } else {
    const turnoId = dateTurnoMap[date] || 4;
    
    // En rotación, quitar de TODOS los dispositivos
    // En dispositivos fijos, solo del dispositivo actual
    if (isRotation) {
      // Quitar de TODOS los dispositivos en esa fecha/turno
      const { error } = await supabase.from('menu_semana')
        .update({ id_dispositivo: 999 })
        .eq('id_agente', selectedResident.id)
        .eq('fecha_asignacion', fechaDB)
        .eq('id_turno', turnoId);  // Sin filtro de dispositivo
      
      if (error) {
        alert("Error: " + error.message);
        setIsLoading(false);
        return;
      }
    } else {
      // Dispositivos fijos: comportamiento actual
      await supabase.from('menu_semana').update({ id_dispositivo: 999 })
        .eq('id_agente', selectedResident.id)
        .eq('id_dispositivo', Number(disp?.id))
        .eq('fecha_asignacion', fechaDB)
        .eq('id_turno', turnoId);
    }
  }
  
  pushUndo({ snapshot: { id_agente: selectedResident.id, fecha_asignacion: fechaDB, id_dispositivo: Number(disp?.id), estado_ejecucion: 'planificado', _table: 'menu_semana', id_turno: turnoId } });
  setSelectedResident(null);
  refresh();
};
```

### Requiere Acceso a
```typescript
// Al inicio del componente:
const orgType = tipoOrganizacionMap[date] || 'dispositivos fijos';
const isRotation = orgType.includes('rotacion');
```

### Criterios de Validación
- [ ] En rotación simple/completa, al quitar se elimina de TODOS los dispositivos
- [ ] Aparece confirmación si hay múltiples dispositivos
- [ ] En dispositivos fijos, mantiene comportamiento actual (solo quita del dispositivo actual)
- [ ] El undo funciona correctamente

---

## PROBLEMA 3.2: Herencia de Grupo en Rotación Completa (CRÍTICO)
### Ubicación
`CellSidebar.tsx` - función `handleAssign` líneas 169-181

### Problema Identificado
```typescript
// Al asignar un residente en rotación:
const { error } = await supabase.from('menu_semana').insert([{
  id_agente: agentId,
  id_dispositivo: parseInt(deviceId),
  fecha_asignacion: fechaDB,
  estado_ejecucion: 'planificado',
  id_convocatoria: convId,
  id_turno: turnoId,
  tipo_organizacion: orgType,
  numero_grupo: existingGroup || null,  // ← No hereda por defecto
}]);
```

**No verifica si el residente ya tiene un grupo asignado en esa fecha/turno.**

### Implementación Requerida
```typescript
// Antes del insert, verificar si ya tiene grupo asignado:
let existingGroup: number | null = null;

// Buscar grupo existente para este agente en esta fecha/turno
const { data: existingAssignments } = await supabase.from('menu_semana')
  .select('numero_grupo')
  .eq('id_agente', agentId)
  .eq('fecha_asignacion', fechaDB)
  .eq('id_turno', turnoId)
  .not('id_dispositivo', 999)  // Excluir pool
  .limit(1);

if (existingAssignments && existingAssignments.length > 0) {
  existingGroup = existingAssignments[0].numero_grupo;
}

// Luego usar existingGroup en el insert
const { error } = await supabase.from('menu_semana').insert([{
  id_agente: agentId,
  id_dispositivo: parseInt(deviceId),
  fecha_asignacion: fechaDB,
  estado_ejecucion: 'planificado',
  id_convocatoria: convId,
  id_turno: turnoId,
  tipo_organizacion: orgType,
  numero_grupo: existingGroup,  // ← Heredar grupo existente o null
}]);
```

### Criterios de Validación
- [ ] Al asignar un residente a un segundo dispositivo, hereda el grupo del primero
- [ ] Si no tiene grupo previo, se puede asignar manualmente
- [ ] El grupo se puede modificar manualmente después (comportamiento existente)
- [ ] No afecta la funcionalidad de dispositivos fijos
- [ ] No afecta apertura

---

## NOTAS SOBRE SUPABASE

### Tablas Involucadas
- `menu`: Apertura al público (turnoFilter === 'apertura')
- `menu_semana`: Turno mañana/tarde (turnoFilter === 'manana' | 'tarde')

### Campos Clave en menu_semana
| Campo | Descripción |
|-------|-------------|
| `id_agente` | ID del residente |
| `id_dispositivo` | ID del dispositivo (999 = pool/sin asignar) |
| `fecha_asignacion` | Fecha en formato YYYY-MM-DD |
| `id_turno` | ID del turno (mañana o tarde) |
| `numero_grupo` | Grupo 1, 2 o 3 (solo en rotación completa) |
| `tipo_organizacion` | 'dispositivos fijos', 'rotacion simple', 'rotacion completa' |

### Relaciones
- Un residente en rotación puede tener MÚLTIPLES filas en `menu_semana` (una por dispositivo)
- Cada fila tiene su propio `numero_grupo`
- El `numero_grupo` debería ser CONSISTENTE para un residente en una fecha/turno específicos

---

## CHECKLIST DE IMPLEMENTACIÓN

- [ ] Agregar `getNotCapacitadoStyle` a `floor-utils.ts`
- [ ] Modificar `PlanningMatrix.tsx` con indicador visual
- [ ] Modificar `ExecutionTab.tsx` con colores de grupo e indicador de no capacitado
- [ ] Modificar `CellSidebar.tsx` con indicador de no capacitado y herencia de grupo
- [ ] Modificar `ResidentSidebar.tsx` con lógica de quitar en rotación
- [ ] Ejecutar `npm run lint`
- [ ] Verificar que no hay regresiones
