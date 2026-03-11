# Reporte de Auditoría de Seguridad

## Resumen Ejecutivo

Se realizó una auditoría de seguridad sobre el código base, configuraciones y variables de entorno del proyecto. No se encontraron fugas de claves privadas altamente críticas (como `SUPABASE_SERVICE_ROLE_KEY`), sin embargo, existen malas prácticas y vulnerabilidades de bajo/medio impacto en el manejo de configuraciones, control de versiones y manejo de peticiones.

## Hallazgos

### 1. Variables de entorno subidas al repositorio (Riesgo Medio)
**Descripción:** El archivo `.env` se encuentra actualmente versionado en Git. Si bien las claves que contiene (con prefijo `VITE_SUPABASE_`) son públicas por naturaleza (anon key) e intentan ser seguras mediante Row Level Security (RLS) en el backend de Supabase, es una mala práctica subir archivos `.env` a los repositorios, dado que aumenta el riesgo de exponer futuros secretos.
**Ubicación:**
- Archivo `.env` en la raíz.
- `.gitignore` (no incluye `.env` para ignorarlo).

**Remediación:**
- Añadir `.env`, `.env.*` (excepto `.env.example`) al archivo `.gitignore`.
- Eliminar el archivo `.env` del tracking de git mediante `git rm --cached .env`.

### 2. Respuesta CORS para peticiones preflight (OPTIONS) (Riesgo Bajo / Funcional)
**Descripción:** En la Edge Function `motor-asignacion-apertura`, la petición OPTIONS (CORS preflight) devuelve `null` en el cuerpo de la respuesta (`new Response(null, { headers: corsHeaders });`). Para Supabase Edge Functions, esto puede generar problemas de fiabilidad y bloqueos por parte de los navegadores en peticiones cross-origin; se recomienda devolver un string simple como `'ok'`.
**Ubicación:** `supabase/functions/motor-asignacion-apertura/index.ts` (línea ~10).

**Remediación:**
- Cambiar a `return new Response('ok', { headers: corsHeaders });`.

### 3. Exposición del `project_id` en configuración de Supabase (Informativo)
**Descripción:** El archivo `supabase/config.toml` contiene hardcodeado el `project_id = "zgzqeusbpobrwanvktyz"`. Si bien en muchos flujos (como Lovable) es estándar, es algo que podría abstraerse si el proyecto fuera Open Source o se desplegara en múltiples entornos.

### 4. `verify_jwt = false` en `config.toml` (Informativo / Correcto)
**Descripción:** La función deshabilita la verificación automática de JWT (`verify_jwt = false`).
**Análisis:** Al revisar la función, se confirma que el código realiza una validación exhaustiva propia del token (`authClient.auth.getUser(token)`). Por lo tanto, no es una vulnerabilidad real en el contexto de la aplicación, pero sí una configuración a tener en cuenta para el futuro (si se añaden más endpoints que no validen por sí mismos).

## Conclusión

El proyecto cuenta con buenas medidas de protección estructurales:
- Uso de `AuthGuard` para el Frontend.
- Las `Edge Functions` validan correctamente al usuario e instancian clientes diferentes para autorizar peticiones o ejecutar cambios en Base de datos (`service_role` desde `Deno.env`).
- Archivo de políticas detallado (`SECURITY.md`).

**Próximos Pasos (Recomendados a implementar en el próximo commit):**
1. Actualizar `.gitignore` y limpiar el index git del `.env`.
2. Modificar la respuesta OPTIONS en la Edge Function para devolver `'ok'`.
