# Seguridad del Proyecto

## Arquitectura de Seguridad

### 1. Variables de Entorno
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`: Claves públicas (anon key), seguras para el cliente.
- `SUPABASE_SERVICE_ROLE_KEY`: **Solo disponible en Edge Functions** via `Deno.env.get()`. Nunca se expone al frontend.

### 2. Row Level Security (RLS)
- **Todas** las tablas tienen RLS activado.
- Políticas base: solo usuarios `authenticated` pueden leer datos operativos.
- Escritura limitada a tablas específicas (menu, calendario, inasistencias, asignaciones).
- El `service_role` bypasea RLS automáticamente (usado solo en Edge Functions).

### 3. Autenticación
- `AuthGuard` protege la aplicación completa.
- Se usa Supabase Auth con `signInWithPassword`.
- El session token se gestiona automáticamente por el SDK.

### 4. Edge Functions
- Usan `SUPABASE_SERVICE_ROLE_KEY` desde `Deno.env`.
- Validan JWT del usuario con `getClaims()`.
- CORS headers configurados correctamente.
- `verify_jwt = false` en config.toml con validación manual en código.

### 5. Headers de Seguridad (producción)
Al publicar con Lovable, los headers de seguridad (HSTS, CSP, X-Frame-Options) son manejados por la plataforma.

### 6. Principios
- Nunca hardcodear credenciales privadas en el código fuente.
- Toda mutación de datos pasa por RLS.
- El frontend solo usa la `anon key` (publishable).
- Lógica sensible va en Edge Functions con service_role.
