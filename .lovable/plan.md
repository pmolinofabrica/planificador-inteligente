

# Fix: Capacitaciones Not Showing (Path2 Convocatoria Matching)

## Root Cause

The `convocatoria` table has **4,582 vigente records** for 2026, but the Supabase query only returns **1,000** (server-side row limit). The 1,000 returned are the oldest records (id_plani 91–766), which point to **2025 planificacion rows** — none of which match any capacitacion. The actual March 2026 convocatorias (id_plani 1971+) never reach the frontend.

This is why:
- All 8 caps with devices show "0 convocatorias matched"
- Path2 produces 0 assignments
- Residents don't appear as trained for devices on March 10/11
- Only Path1 (direct attendance records) works

## Solution: Use Existing Server-Side RPC

The database already has `rpc_obtener_convocados_matriz(anio_filtro)` which performs the exact same capacitacion-matching logic **server-side** (no row limits). It returns `(id_cap, id_agente)` pairs.

### Changes to `src/lib/caps-builder.ts`

1. Accept a new optional input: `convocadosMatriz: { id_cap: number; id_agente: number }[]`
2. Replace Path2 (convocatoria inference from client-side data) with a simple loop over the RPC results: for each `(id_cap, id_agente)` pair, call `assignCap` using `capDates[id_cap]` and `capDispos[id_cap]`
3. Remove the now-unnecessary `convsData` and `planisData` inputs (or keep them for the agentGroups logic if still needed)

### Changes to `src/hooks/useAssignmentData.ts`

1. Replace the `convocatoria` + `planificacion` fetches (which hit the 1000-row limit) with a single RPC call:
   ```
   supabase.rpc('rpc_obtener_convocados_matriz', { anio_filtro: Number(yFilt) })
   ```
2. Pass the RPC result to `buildResidentCaps` as the new `convocadosMatriz` parameter
3. Remove or reduce the `.limit(10000)` convocatoria fetch — it's no longer needed for caps. (Keep a narrower convocatoria fetch only for the `agentConvocatoriaMap` used in assignment persistence.)

### Cleanup

- Remove debug `console.log`/`console.warn` statements from `caps-builder.ts`
- The `planiToCap` mapping logic becomes unnecessary and can be removed
- Keep `planisData` fetch for active dates / turno detection (already used elsewhere)

### Enrique Martina (Group Issue)

The group assignment is derived from `capGroups` in Path1 and the convocados matrix. With the RPC fix, her group will be correctly inferred from the capacitaciones she actually attended or was convocated to on each specific date — the RPC already handles the `grupo` matching correctly via `p.grupo = c.grupo`.

