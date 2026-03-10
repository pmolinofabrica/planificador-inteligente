# Instrucciones de Implementación para Agente Antigravity

## CONTEXTO DEL PROYECTO

### Información General
- **Proyecto**: Planificador Inteligente - Sistema de asignación de residentes a dispositivos
- **Repositorio**: https://github.com/pmolinofabrica/planificador-inteligente
- **Framework**: Vite + React 18 + TypeScript (SPA, NO es Next.js)
- **Generador Original**: Lovable.dev
- **Deployment**: Cloudflare Pages + Supabase
- **Uso**: Interno, 4-5 usuarios máximo
- **Presupuesto**: $0 (planes gratuitos - optimización de recursos es CRÍTICA)

### Stack Tecnológico
```
Frontend:  Vite 6 → React 18 → TypeScript 5 → TanStack Query → shadcn/ui → Tailwind CSS
Backend:   Supabase (PostgreSQL + Auth + Edge Functions + RLS)
Deploy:    Cloudflare Pages (wrangler.jsonc)
```

### Conexión a Supabase
- El agente Jules tiene acceso directo a Supabase para testing
- Variables de entorno ya configuradas en Cloudflare
- Edge Functions desplegadas en Supabase

---

## TAREAS A IMPLEMENTAR

### TAREA 1: Generación Dinámica de Meses (CRÍTICO)

**Problema Actual:**
```typescript
// En src/pages/Index.tsx línea 17
const MONTHS_LIST = ["Febrero 2026", "Marzo 2026", "Abril 2026"];
```

**Requerimiento:**
- Generar dinámicamente todos los meses del año escolar (Febrero a Diciembre)
- El año debe basarse en el año actual o configuración dinámica
- Al cambiar de año, automáticamente mostrar los meses del nuevo año

**Implementación Esperada:**

1. Crear archivo `src/utils/dateUtils.ts`:
```typescript
/**
 * Genera la lista de meses para el año escolar.
 * El año escolar va desde Febrero hasta Diciembre del mismo año.
 * Si estamos en Enero, muestra el año anterior (año escolar en curso).
 */
export function generateSchoolYearMonths(): string[] {
  const months = [
    "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12 (Enero = 1)
  
  // Si estamos en Enero, el año escolar en curso es el año anterior
  const schoolYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  
  return months.map(m => `${m} ${schoolYear}`);
}

/**
 * Extrae año y mes de un string como "Marzo 2026"
 */
export function parseMonthYear(monthYearString: string): { year: number; month: number } {
  const parts = monthYearString.split(" ");
  const monthName = parts[0];
  const year = parseInt(parts[1], 10);
  
  const monthMap: Record<string, number> = {
    "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4,
    "Mayo": 5, "Junio": 6, "Julio": 7, "Agosto": 8,
    "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12
  };
  
  return { year, month: monthMap[monthName] || 1 };
}
```

2. Modificar `src/pages/Index.tsx`:
```typescript
import { generateSchoolYearMonths } from '@/utils/dateUtils';

// Reemplazar línea 17 con:
const MONTHS_LIST = useMemo(() => generateSchoolYearMonths(), []);

// Actualizar estado inicial para seleccionar el mes actual o el primer mes disponible
const [selectedMonth, setSelectedMonth] = useState(() => {
  const months = generateSchoolYearMonths();
  const now = new Date();
  const currentMonthName = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ][now.getMonth()];
  const currentYear = now.getFullYear();
  const schoolYear = now.getMonth() === 0 ? currentYear - 1 : currentYear;
  const currentMonthStr = `${currentMonthName} ${schoolYear}`;
  
  // Si el mes actual está en la lista, seleccionarlo; si no, el primero
  return months.includes(currentMonthStr) ? currentMonthStr : months[0];
});
```

**Criterios de Validación:**
- [ ] Los meses se generan dinámicamente al cargar la app
- [ ] Al cambiar de año (paso de Diciembre a Enero), se actualiza automáticamente
- [ ] El mes actual está preseleccionado por defecto
- [ ] No hay meses hardcodeados en el código

---

### TAREA 2: Cohorte Dinámica (CRÍTICO)

**Problema Actual:**
Múltiples archivos tienen la cohorte hardcodeada como `2026`:
- `src/pages/Index.tsx` línea 94: `.eq('cohorte', 2026)`
- `src/hooks/useAssignmentData.ts` línea 94: `.eq('cohorte', 2026)`
- Edge Function `motor-asignacion-apertura/index.ts` línea 51: `anio_cohorte = 2026`

**Requerimiento:**
- La cohorte debe ser el año actual por defecto
- Permitir que el usuario cambie la cohorte desde la UI (opcional, como configuración)

**Implementación Esperada:**

1. Crear/verificar tabla de configuración en Supabase:
```sql
-- Si no existe, crear tabla de configuración
CREATE TABLE IF NOT EXISTS public.config_cohorte (
  id INT PRIMARY KEY DEFAULT 1,
  cohorte_activa INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar registro inicial si no existe
INSERT INTO public.config_cohorte (id, cohorte_activa)
VALUES (1, EXTRACT(YEAR FROM CURRENT_DATE))
ON CONFLICT (id) DO NOTHING;
```

2. Crear hook `src/hooks/useConfig.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useActiveCohorte() {
  return useQuery({
    queryKey: ['config', 'cohorte'],
    queryFn: async () => {
      // Intentar obtener de config_cohorte
      const { data, error } = await supabase
        .from('config_cohorte')
        .select('cohorte_activa')
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.warn('Error fetching cohorte config, using current year:', error);
        return new Date().getFullYear();
      }
      
      return data?.cohorte_activa ?? new Date().getFullYear();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    placeholderData: new Date().getFullYear(), // Valor inicial inmediato
  });
}
```

3. Modificar `src/hooks/useAssignmentData.ts`:
```typescript
import { useActiveCohorte } from './useConfig';

// Al inicio del hook:
const { data: activeCohorte } = useActiveCohorte();
const cohorte = activeCohorte ?? new Date().getFullYear();

// Reemplazar línea 94:
.eq('cohorte', cohorte)
```

4. Modificar Edge Function `supabase/functions/motor-asignacion-apertura/index.ts`:
```typescript
// Cambiar default en línea 51:
const { mes_objetivo, anio_cohorte = new Date().getFullYear(), start_date } = body;
```

**Criterios de Validación:**
- [ ] La cohorte se obtiene dinámicamente
- [ ] Si falla la consulta, usa el año actual como fallback
- [ ] El comportamiento no cambia para el usuario final
- [ ] La Edge Function también actualiza su default a `new Date().getFullYear()`

---

### TAREA 3: Optimización de Filtrado por Año (IMPORTANTE)

**Problema Actual:**
El hook `useAssignmentData` trae muchos datos y filtra en el cliente. Esto consume recursos innecesarios.

**Consultas Problemáticas Identificadas:**
```typescript
// Línea 105-115: Trae 5000-10000 registros y filtra después
supabase.from('capacitaciones_participantes').select(...).limit(5000)
supabase.from('capacitaciones_dispositivos').select(...).limit(5000)
supabase.from('planificacion').select(...).limit(5000)
supabase.from('convocatoria').select(...).limit(10000)
```

**Requerimiento:**
- Filtrar datos por año EN EL SERVIDOR (Supabase)
- Reducir la cantidad de datos transferidos
- Mantener funcionalidad existente

**Implementación Esperada:**

1. Modificar consultas para filtrar por año usando JOINs o rangos de fecha:

```typescript
// En useAssignmentData.ts, modificar las consultas:

// Capacitaciones: filtrar por año de la fecha del día
const yearStart = `${year}-01-01`;
const yearEnd = `${year}-12-31`;

// Obtener IDs de días del año actual primero
const { data: diasDelAnio } = await supabase
  .from('dias')
  .select('id_dia')
  .gte('fecha', yearStart)
  .lte('fecha', yearEnd);

const diasIds = (diasDelAnio || []).map(d => d.id_dia);

// Luego filtrar capacitaciones por esos días
const { data: capsRep } = await supabase
  .from('capacitaciones')
  .select('id_cap, id_dia, id_turno, grupo')
  .in('id_dia', diasIds);
```

2. Alternativa: Crear RPC en Supabase para datos filtrados:
```sql
CREATE OR REPLACE FUNCTION rpc_get_datos_planificacion(
  anio INT,
  mes INT
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'capacitaciones', (SELECT json_agg(c.*) FROM capacitaciones c
      JOIN dias d ON c.id_dia = d.id_dia
      WHERE EXTRACT(YEAR FROM d.fecha) = anio),
    'convocatorias', (SELECT json_agg(conv.*) FROM convocatoria conv
      JOIN planificacion p ON conv.id_plani = p.id_plani
      JOIN dias d ON p.id_dia = d.id_dia
      WHERE EXTRACT(YEAR FROM d.fecha) = anio AND EXTRACT(MONTH FROM d.fecha) = mes)
    -- ... más tablas
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

**Criterios de Validación:**
- [ ] Las consultas a Supabase devuelven menos filas
- [ ] El filtrado por año ocurre en el servidor
- [ ] No se usan `.limit()` arbitrarios para "resolver" el problema
- [ ] El tiempo de carga mejora o se mantiene

---

### TAREA 4: Arquitectura Modular del Hook (RECOMENDADO)

**Problema Actual:**
`src/hooks/useAssignmentData.ts` tiene ~500 líneas con múltiples responsabilidades:
- Carga de dispositivos
- Carga de residentes
- Carga de capacitaciones
- Carga de convocatorias
- Carga de menú/menu_semana
- Carga de calendario
- Carga de inasistencias
- Carga de visitas
- Procesamiento y cruce de datos

**Requerimiento:**
Dividir en hooks modulares que permitan:
- Cargar solo lo necesario según el tab activo
- Cache inteligente con React Query
- Mejor mantenibilidad

**Estructura Propuesta:**
```
src/hooks/
├── data/
│   ├── useDevices.ts          # Dispositivos (carga única, cache largo)
│   ├── useResidents.ts        # Residentes del año (cache medio)
│   ├── useCalendar.ts         # Calendario por mes (cache corto)
│   ├── useAssignments.ts      # Menú/menu_semana por mes
│   ├── useInasistencias.ts    # Inasistencias del mes
│   ├── useVisitas.ts          # Visitas por mes
│   └── useCapacitaciones.ts   # Capacitaciones del año
├── useAuth.ts                 # Ya existe ✓
├── useUndoStack.ts            # Ya existe ✓
└── useConfig.ts               # Configuración (cohorte, etc.)
```

**Implementación de Ejemplo:**

```typescript
// src/hooks/data/useDevices.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Device {
  id: string;
  name: string;
  min: number;
  max: number;
  piso: number;
}

export function useDevices() {
  return useQuery({
    queryKey: ['devices'],
    queryFn: async (): Promise<Device[]> => {
      const { data, error } = await supabase
        .from('dispositivos')
        .select('id_dispositivo, nombre_dispositivo, piso_dispositivo, cupo_minimo, cupo_optimo')
        .eq('activo', true)
        .neq('id_dispositivo', 999)
        .order('piso_dispositivo', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(d => ({
        id: String(d.id_dispositivo),
        name: `(P${d.piso_dispositivo || '?'}) ${d.nombre_dispositivo}`,
        min: d.cupo_minimo || 1,
        max: d.cupo_optimo || 1,
        piso: d.piso_dispositivo || 0
      }));
    },
    staleTime: 10 * 60 * 1000, // 10 minutos - datos raramente cambian
    gcTime: 60 * 60 * 1000,    // 1 hora - mantener en cache
  });
}
```

```typescript
// src/hooks/data/useResidents.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Resident {
  id_agente: number;
  nombre: string;
  apellido: string;
}

export function useResidents(cohorte: number) {
  return useQuery({
    queryKey: ['residents', cohorte],
    queryFn: async (): Promise<Resident[]> => {
      const { data, error } = await supabase
        .from('datos_personales')
        .select('id_agente, nombre, apellido, cohorte')
        .eq('activo', true)
        .eq('cohorte', cohorte);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: !!cohorte,       // Solo ejecutar si hay cohorte
  });
}
```

**Hook Orquestador (simplificado):**
```typescript
// src/hooks/useAssignmentData.ts (nueva versión)
import { useDevices, Device } from './data/useDevices';
import { useResidents, Resident } from './data/useResidents';
import { useCalendar } from './data/useCalendar';
import { useAssignments } from './data/useAssignments';
// ... más imports

interface UseAssignmentDataProps {
  selectedMonth: string;
  turnoFilter?: string;
}

export function useAssignmentData({ selectedMonth, turnoFilter = 'apertura' }: UseAssignmentDataProps) {
  const { data: devices = [], isLoading: loadingDevices } = useDevices();
  const { data: residents = [], isLoading: loadingResidents } = useResidents(activeCohorte);
  const { data: calendar = {}, isLoading: loadingCalendar } = useCalendar({ year, month, turnoFilter });
  const { data: assignments = {}, isLoading: loadingAssignments } = useAssignments({ year, month, turnoFilter });
  // ... más hooks
  
  const isLoading = loadingDevices || loadingResidents || loadingCalendar || loadingAssignments;
  
  // Combinar datos según necesidad del tab activo
  // ...
  
  return {
    devices,
    residents,
    calendar,
    assignments,
    isLoading,
    // ... más valores
  };
}
```

**Criterios de Validación:**
- [ ] Cada hook tiene responsabilidad única
- [ ] React Query maneja cache y estados de carga
- [ ] El hook principal orquesta los demás
- [ ] La funcionalidad no cambia para el usuario
- [ ] Se pueden cargar datos lazy según el tab activo

---

## PUNTOS A EVALUAR (Para el Agente)

### 1. Arquitectura Frontend
- ¿La estructura de archivos es clara y escalable?
- ¿Los componentes siguen el principio de responsabilidad única?
- ¿El estado está bien manejado (local vs global)?

### 2. Seguridad
- ¿El CORS wildcard (`"Access-Control-Allow-Origin": "*"`) es apropiado para uso interno?
- ¿Las políticas RLS son suficientes para el caso de uso?
- ¿Hay validación de entrada en todos los formularios?
- ¿Las Edge Functions validan correctamente el JWT?

### 3. Flujo de Datos y DAMA
- ¿Las relaciones entre tablas son correctas?
- ¿Hay redundancia de datos que pueda eliminarse?
- ¿Los índices de la base de datos son adecuados?
- ¿Hay queries N+1 o ineficientes?

### 4. Rendimiento (Crítico para Plan Gratuito)
- ¿Se están cargando datos innecesarios?
- ¿Hay oportunidades para lazy loading?
- ¿El cache de React Query está bien configurado?
- ¿Las consultas a Supabase son eficientes?

---

## NOTAS IMPORTANTES

### Sobre Variables de Entorno
Las variables están configuradas en Cloudflare. El agente no necesita crear archivos `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

### Sobre Testing
- No hay tests existentes
- La configuración de tests se dejará para el final
- Priorizar funcionalidad sobre cobertura de tests

### Sobre Deployment
- El proyecto se despliega automáticamente desde GitHub a Cloudflare Pages
- Las Edge Functions se despliegan en Supabase
- Verificar que los cambios no rompan el deployment

### Sobre Comunicación
Si encuentras inconsistencias o dudas:
1. Documentar en el PR o commit
2. Hacer la implementación más razonable
3. Marcar con comentario `// TODO: revisar` si hay incertidumbre

---

## CHECKLIST DE ENTREGA

Antes de finalizar, verificar:

- [ ] Meses se generan dinámicamente
- [ ] Cohorte es dinámica (usa año actual o configuración)
- [ ] Filtrado por año ocurre en el servidor
- [ ] (Opcional) Hook modular implementado
- [ ] No hay regresiones en funcionalidad existente
- [ ] El código pasa `npm run lint` sin errores
- [ ] El build (`npm run build`) funciona correctamente

---

## ARCHIVOS CLAVE A MODIFICAR

| Archivo | Cambios |
|---------|---------|
| `src/utils/dateUtils.ts` | CREAR - Funciones de fecha |
| `src/pages/Index.tsx` | Usar meses dinámicos |
| `src/hooks/useConfig.ts` | CREAR - Hook de configuración |
| `src/hooks/useAssignmentData.ts` | Usar cohorte dinámica, optimizar queries |
| `supabase/functions/motor-asignacion-apertura/index.ts` | Default dinámico |
| `supabase/migrations/` | CREAR migración para config_cohorte (si aplica) |

---

*Documento preparado para agente Antigravity - Sonnet 4.6 / Opus*
