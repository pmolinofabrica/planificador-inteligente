import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: validate JWT from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Missing environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth client (para validar JWT)
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Token inválido o expirado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { mes_objetivo, anio_cohorte = new Date().getFullYear(), start_date } = body;

    if (!mes_objetivo) {
      return new Response(
        JSON.stringify({ error: 'Falta parámetro "mes_objetivo" (MM-YYYY)' }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Service role client for DB access
    const supabase = createClient(supabaseUrl, serviceKey);

    const [month, year] = mes_objetivo.split("-");
    const fechaInicio = `${year}-${month}-01`;
    const fechaFin = `${year}-${month}-31`;

    const log: string[] = [];
    const addLog = (msg: string) => {
      log.push(msg);
      console.log(msg);
    };

    addLog(
      `--- MOTOR APERTURA v3.0 (Edge Function) | ${mes_objetivo} | Cohorte ${anio_cohorte} ---`
    );

    // =====================================================================
    // STEP 1: FETCH DATA
    // =====================================================================

    // 1a. Residentes activos
    const { data: residentes } = await supabase
      .from("datos_personales")
      .select("id_agente, nombre, apellido")
      .eq("activo", true)
      .eq("cohorte", anio_cohorte);
    addLog(`✅ Residentes activos: ${residentes?.length ?? 0}`);

    // 1b. Dispositivos operativos
    const { data: dispositivos } = await supabase
      .from("dispositivos")
      .select("id_dispositivo, nombre_dispositivo, cupo_optimo, cupo_minimo")
      .eq("activo", true);
    const dispoData: Record<
      number,
      { nombre: string; cupoMin: number; cupoMax: number }
    > = {};
    for (const d of dispositivos || []) {
      dispoData[d.id_dispositivo] = {
        nombre: d.nombre_dispositivo,
        cupoMin: d.cupo_minimo ?? 1,
        cupoMax: d.cupo_optimo ?? 2,
      };
    }
    addLog(`✅ Dispositivos: ${Object.keys(dispoData).length}`);

    // 1c. Cupos dinámicos de calendario_dispositivos (FUENTE DE VERDAD)
    // Filtrar por id_turno de apertura
    const { data: turnosApertura } = await supabase
      .from("turnos")
      .select("id_turno")
      .ilike("tipo_turno", "%apertura%");
    const idsApertura = (turnosApertura || []).map(
      (t: { id_turno: number }) => t.id_turno
    );
    addLog(`✅ Turnos apertura IDs: [${idsApertura.join(",")}]`);

    const { data: calendarioRows } = await supabase
      .from("calendario_dispositivos")
      .select("id_dispositivo, fecha, cupo_objetivo, id_turno")
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin)
      .in("id_turno", idsApertura);

    const cuposPorFecha: Record<string, Record<number, number>> = {};
    for (const row of calendarioRows || []) {
      if (!cuposPorFecha[row.fecha]) cuposPorFecha[row.fecha] = {};
      cuposPorFecha[row.fecha][row.id_dispositivo] = row.cupo_objetivo ?? 0;
    }
    addLog(
      `✅ Cupos dinámicos calendario: ${(calendarioRows || []).length} registros`
    );

    // 1d. Capacitaciones (caps_builder logic — direct attendance path)
    const { data: capData } = await supabase
      .from("capacitaciones")
      .select("id_cap, id_dia, grupo");

    const idsDias = [
      ...new Set(
        (capData || []).map((c: { id_dia: number }) => c.id_dia).filter(Boolean)
      ),
    ];

    // Fetch dias in batches to avoid URL length limits
    let diasData: { id_dia: number; fecha: string }[] = [];
    const batchSize = 200;
    for (let i = 0; i < idsDias.length; i += batchSize) {
      const batch = idsDias.slice(i, i + batchSize);
      const { data: batchDias } = await supabase
        .from("dias")
        .select("id_dia, fecha")
        .in("id_dia", batch);
      if (batchDias) diasData = diasData.concat(batchDias);
    }

    const diasDict: Record<number, string> = {};
    for (const d of diasData) {
      if (d.fecha) diasDict[d.id_dia] = d.fecha.substring(0, 10);
    }

    const capDates: Record<number, string> = {};
    for (const c of capData || []) {
      const realDate = diasDict[c.id_dia];
      if (realDate) capDates[c.id_cap] = realDate;
    }

    const { data: capDispoData } = await supabase
      .from("capacitaciones_dispositivos")
      .select("id_cap, id_dispositivo");
    const capDispos: Record<number, number[]> = {};
    for (const cd of capDispoData || []) {
      if (!capDispos[cd.id_cap]) capDispos[cd.id_cap] = [];
      capDispos[cd.id_cap].push(cd.id_dispositivo);
    }

    // Path 1: Direct attendance
    const { data: partsData } = await supabase
      .from("capacitaciones_participantes")
      .select("id_agente, id_cap, asistio")
      .eq("asistio", true);

    // Path 2: RPC convocados matriz
    const { data: convocadosMatriz } = await supabase.rpc(
      "rpc_obtener_convocados_matriz",
      { anio_filtro: anio_cohorte }
    );

    // Build caps per agent: { agentId: { dispoId: earliestDate } }
    const capsPorAgente: Record<number, Record<number, string>> = {};
    for (const r of residentes || []) {
      capsPorAgente[r.id_agente] = {};
    }

    const assignCap = (agentId: number, deviceId: number, date: string) => {
      if (!capsPorAgente[agentId]) return;
      const existing = capsPorAgente[agentId][deviceId];
      if (!existing || date < existing) {
        capsPorAgente[agentId][deviceId] = date;
      }
    };

    for (const p of partsData || []) {
      const cDate = capDates[p.id_cap];
      const dispos = capDispos[p.id_cap] || [];
      if (cDate) {
        for (const dId of dispos) assignCap(p.id_agente, dId, cDate);
      }
    }

    for (const row of convocadosMatriz || []) {
      const cDate = capDates[row.id_cap];
      const dispos = capDispos[row.id_cap] || [];
      if (cDate) {
        for (const dId of dispos) assignCap(row.id_agente, dId, cDate);
      }
    }

    const totalCaps = Object.values(capsPorAgente).reduce(
      (sum, c) => sum + Object.keys(c).length,
      0
    );
    addLog(`✅ Capacitaciones totales mapeadas: ${totalCaps}`);

    // 1e. Convocatorias de apertura del mes
    const { data: diasMes } = await supabase
      .from("dias")
      .select("id_dia, fecha")
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin);
    const idDiaToFecha: Record<number, string> = {};
    for (const d of diasMes || []) {
      idDiaToFecha[d.id_dia] = d.fecha;
    }

    let planiData: { id_plani: number; id_dia: number }[] = [];
    if (Object.keys(idDiaToFecha).length > 0 && idsApertura.length > 0) {
      const { data } = await supabase
        .from("planificacion")
        .select("id_plani, id_dia")
        .in("id_dia", Object.keys(idDiaToFecha).map(Number))
        .in("id_turno", idsApertura);
      planiData = data || [];
    }

    const idPlaniToFecha: Record<number, string> = {};
    for (const p of planiData) {
      if (idDiaToFecha[p.id_dia]) {
        idPlaniToFecha[p.id_plani] = idDiaToFecha[p.id_dia];
      }
    }

    let convData: {
      id_convocatoria: number;
      id_agente: number;
      id_plani: number;
    }[] = [];
    if (Object.keys(idPlaniToFecha).length > 0) {
      const { data } = await supabase
        .from("convocatoria")
        .select("id_convocatoria, id_agente, id_plani")
        .eq("estado", "vigente")
        .eq("turno_cancelado", false)
        .in("id_plani", Object.keys(idPlaniToFecha).map(Number));
      convData = data || [];
    }

    // { fecha: { agentId: convocatoriaId } }
    const convocatoriasPorDia: Record<
      string,
      Record<number, number>
    > = {};
    for (const row of convData) {
      const fecha = idPlaniToFecha[row.id_plani];
      if (!fecha) continue;
      if (!convocatoriasPorDia[fecha]) convocatoriasPorDia[fecha] = {};
      convocatoriasPorDia[fecha][row.id_agente] = row.id_convocatoria;
    }
    addLog(
      `✅ Convocatorias apertura: ${convData.length} en ${Object.keys(convocatoriasPorDia).length} días`
    );

    // 1f. Inasistencias (Hard Constraint D)
    const { data: inasistenciasData } = await supabase
      .from("inasistencias")
      .select("id_agente, fecha_inasistencia")
      .gte("fecha_inasistencia", fechaInicio)
      .lte("fecha_inasistencia", fechaFin);
    const inasistenciasPorDia: Record<string, Set<number>> = {};
    for (const row of inasistenciasData || []) {
      const f = row.fecha_inasistencia;
      if (!inasistenciasPorDia[f]) inasistenciasPorDia[f] = new Set();
      inasistenciasPorDia[f].add(row.id_agente);
    }
    addLog(`✅ Inasistencias: ${(inasistenciasData || []).length}`);

    // 1g. Pre-cargar historial existente de TODO EL AÑO (equidad anual)
    const anioInicio = `${year}-01-01`;
    const anioFin = `${year}-12-31`;
    const { data: menuPrevio } = await supabase
      .from("menu")
      .select("id_agente, id_dispositivo, fecha_asignacion")
      .gte("fecha_asignacion", anioInicio)
      .lte("fecha_asignacion", anioFin);

    const historialPrevio: Record<number, Record<number, number>> = {};
    const cargaGlobalPrevia: Record<number, number> = {};
    for (const row of menuPrevio || []) {
      if (row.id_dispositivo === 999) continue;
      if (!historialPrevio[row.id_agente])
        historialPrevio[row.id_agente] = {};
      historialPrevio[row.id_agente][row.id_dispositivo] =
        (historialPrevio[row.id_agente][row.id_dispositivo] || 0) + 1;
      cargaGlobalPrevia[row.id_agente] =
        (cargaGlobalPrevia[row.id_agente] || 0) + 1;
    }
    addLog(`✅ Historial previo del año ${year}: ${(menuPrevio || []).length} filas`);

    // =====================================================================
    // STEP 2: ASSIGNMENT ENGINE (3-Phase)
    // =====================================================================

    // Derive days to process — only current/future dates
    const today = start_date || new Date().toISOString().split("T")[0];
    let diasAProcesar = Object.keys(convocatoriasPorDia)
      .filter((d) => d >= today)
      .sort();
    addLog(`📅 Días a procesar: ${diasAProcesar.length} → [${diasAProcesar.join(", ")}]`);

    // Tracking
    const historialRotacion: Record<number, Record<number, number>> = {};
    const cargaGlobal: Record<number, number> = {};
    for (const r of residentes || []) {
      historialRotacion[r.id_agente] = {};
      cargaGlobal[r.id_agente] = 0;
    }
    // Pre-load existing history
    for (const [aidStr, dispos] of Object.entries(historialPrevio)) {
      const aid = Number(aidStr);
      if (historialRotacion[aid]) {
        for (const [didStr, count] of Object.entries(dispos)) {
          historialRotacion[aid][Number(didStr)] = count as number;
        }
      }
    }
    for (const [aidStr, count] of Object.entries(cargaGlobalPrevia)) {
      const aid = Number(aidStr);
      if (cargaGlobal[aid] !== undefined) cargaGlobal[aid] = count;
    }

    // Helper: get cupo for a device on a date
    const getCupo = (dispoId: number, fecha: string): number => {
      return cuposPorFecha[fecha]?.[dispoId] ?? 0;
    };

    // Scoring function
    const calcScore = (
      agentId: number,
      dispoId: number,
      dia: string
    ): number => {
      const localRepeat = historialRotacion[agentId]?.[dispoId] || 0;
      const globalLoad = cargaGlobal[agentId] || 0;
      // Seed-based reproducible tiebreaker
      const seed =
        (agentId * 31 + dispoId * 17 + hashStr(dia)) % 6;
      return 1000 - 500 * localRepeat - 80 * globalLoad + seed;
    };

    // Simple string hash for reproducibility
    const hashStr = (s: string): number => {
      let h = 0;
      for (let i = 0; i < s.length; i++) {
        h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
      }
      return h;
    };

    // Results
    type AssignResult = { id: number; score: number };
    const grilla: Record<string, Record<number, AssignResult[]>> = {};
    const stats = { huecos: 0, libres: 0, total_asignados: 0 };

    for (const fecha of diasAProcesar) {
      const convocadosHoy = convocatoriasPorDia[fecha] || {};
      const agentesConvocados = (residentes || []).filter(
        (r: { id_agente: number }) => convocadosHoy[r.id_agente] !== undefined
      );

      // Filter: only agents convocados AND not absent
      const agentesDisponibles = agentesConvocados.filter(
        (r: { id_agente: number }) =>
          !inasistenciasPorDia[fecha]?.has(r.id_agente)
      );

      // Build per-device cupos for today (only devices with cupo > 0)
      const disposHoy: {
        id: number;
        cupo: number;
      }[] = [];
      for (const [didStr, cupo] of Object.entries(
        cuposPorFecha[fecha] || {}
      )) {
        const did = Number(didStr);
        if (cupo > 0 && dispoData[did]) {
          disposHoy.push({ id: did, cupo });
        }
      }

      // Scarcity heuristic: sort by how many eligible candidates each device has
      const escasez: Record<number, number> = {};
      for (const dispo of disposHoy) {
        let aptos = 0;
        for (const r of agentesDisponibles) {
          const fcap = capsPorAgente[r.id_agente]?.[dispo.id];
          if (fcap && fcap <= fecha) aptos++;
        }
        escasez[dispo.id] = aptos;
      }
      disposHoy.sort((a, b) => (escasez[a.id] || 0) - (escasez[b.id] || 0));

      const asignadosHoy = new Set<number>();
      grilla[fecha] = {};
      for (const d of disposHoy) grilla[fecha][d.id] = [];

      // Find best candidate for a device among remaining pool
      const findBest = (
        dispoId: number,
        pool: { id_agente: number }[]
      ): { agentId: number; score: number } | null => {
        let best: { agentId: number; score: number } | null = null;
        for (const r of pool) {
          if (asignadosHoy.has(r.id_agente)) continue;
          // Hard Constraint B: capacitado a tiempo
          const fcap = capsPorAgente[r.id_agente]?.[dispoId];
          if (!fcap || fcap > fecha) continue;
          const score = calcScore(r.id_agente, dispoId, fecha);
          if (!best || score > best.score) {
            best = { agentId: r.id_agente, score };
          }
        }
        return best;
      };

      // PHASE 1: Guarantee at least 1 per device (scarcest first)
      for (const dispo of disposHoy) {
        if (grilla[fecha][dispo.id].length >= 1) continue;
        const best = findBest(dispo.id, agentesDisponibles);
        if (best) {
          asignadosHoy.add(best.agentId);
          grilla[fecha][dispo.id].push({
            id: best.agentId,
            score: best.score,
          });
          historialRotacion[best.agentId][dispo.id] =
            (historialRotacion[best.agentId][dispo.id] || 0) + 1;
          cargaGlobal[best.agentId] = (cargaGlobal[best.agentId] || 0) + 1;
        } else {
          stats.huecos++;
        }
      }

      // PHASE 2: Fill up to cupo with remaining pool
      for (const dispo of disposHoy) {
        while (grilla[fecha][dispo.id].length < dispo.cupo) {
          const best = findBest(dispo.id, agentesDisponibles);
          if (!best) break;
          asignadosHoy.add(best.agentId);
          grilla[fecha][dispo.id].push({
            id: best.agentId,
            score: best.score,
          });
          historialRotacion[best.agentId][dispo.id] =
            (historialRotacion[best.agentId][dispo.id] || 0) + 1;
          cargaGlobal[best.agentId] = (cargaGlobal[best.agentId] || 0) + 1;
        }
      }

      // PHASE 3: Emergency — place remaining convocados+capacitados somewhere (overflow)
      const sinAsignar = agentesDisponibles.filter(
        (r: { id_agente: number }) => !asignadosHoy.has(r.id_agente)
      );
      for (const r of sinAsignar) {
        // Find any device where this agent is capacitado, pick best score
        let bestDispo: { dispoId: number; score: number } | null = null;
        for (const dispo of disposHoy) {
          const fcap = capsPorAgente[r.id_agente]?.[dispo.id];
          if (!fcap || fcap > fecha) continue;
          // Penalize overflow: -200 per extra person above cupo
          const overflow = Math.max(
            0,
            grilla[fecha][dispo.id].length - dispo.cupo
          );
          const score =
            calcScore(r.id_agente, dispo.id, fecha) - 200 * overflow;
          if (!bestDispo || score > bestDispo.score) {
            bestDispo = { dispoId: dispo.id, score };
          }
        }
        if (bestDispo) {
          asignadosHoy.add(r.id_agente);
          grilla[fecha][bestDispo.dispoId].push({
            id: r.id_agente,
            score: bestDispo.score,
          });
          historialRotacion[r.id_agente][bestDispo.dispoId] =
            (historialRotacion[r.id_agente][bestDispo.dispoId] || 0) + 1;
          cargaGlobal[r.id_agente] = (cargaGlobal[r.id_agente] || 0) + 1;
        }
        // If agent has no capacitación for any device today, they stay unassigned (P0/pool)
      }

      const libresHoy = agentesDisponibles.filter(
        (r: { id_agente: number }) => !asignadosHoy.has(r.id_agente)
      ).length;
      stats.libres += libresHoy;
      stats.total_asignados += asignadosHoy.size;

      addLog(
        `  ${fecha}: ${asignadosHoy.size} asignados | ${libresHoy} en pool P0`
      );
    }

    // =====================================================================
    // STEP 3: PERSIST TO DB (menu table)
    // =====================================================================

    const batchPayload: Record<string, unknown>[] = [];
    const vacantPayload: Record<string, unknown>[] = [];

    for (const fecha of diasAProcesar) {
      const convocadosHoy = convocatoriasPorDia[fecha] || {};
      const asignadosHoy = new Set<number>();

      for (const [didStr, agentes] of Object.entries(grilla[fecha] || {})) {
        const did = Number(didStr);
        for (const ag of agentes as AssignResult[]) {
          asignadosHoy.add(ag.id);
          const idConv = convocadosHoy[ag.id];
          if (idConv) {
            batchPayload.push({
              id_convocatoria: idConv,
              id_dispositivo: did,
              id_agente: ag.id,
              fecha_asignacion: fecha,
              estado_ejecucion: "planificado",
              orden: Math.max(1, ag.score),
            });
          }
        }
      }

      // Convocados not assigned → device 999 (pool/descanso)
      for (const [aidStr, idConv] of Object.entries(convocadosHoy)) {
        const aid = Number(aidStr);
        if (!asignadosHoy.has(aid)) {
          vacantPayload.push({
            id_convocatoria: idConv,
            id_dispositivo: 999,
            id_agente: aid,
            fecha_asignacion: fecha,
            estado_ejecucion: "planificado",
          });
        }
      }
    }

    addLog(
      `\n📊 Resultado: ${batchPayload.length} asignaciones + ${vacantPayload.length} vacantes (pool P0)`
    );

    // Delete existing motor-generated rows for the dates we're processing
    // (only planificado status, to avoid overwriting manually executed ones)
    for (const fecha of diasAProcesar) {
      const { error: delErr } = await supabase
        .from("menu")
        .delete()
        .eq("fecha_asignacion", fecha)
        .eq("estado_ejecucion", "planificado");
      if (delErr) {
        addLog(`⚠️ Error borrando previos de ${fecha}: ${delErr.message}`);
      }
    }

    // Insert in batches of 500
    const allPayload = [...batchPayload, ...vacantPayload];
    let insertedCount = 0;
    for (let i = 0; i < allPayload.length; i += 500) {
      const batch = allPayload.slice(i, i + 500);
      const { error } = await supabase.from("menu").insert(batch);
      if (error) {
        addLog(`❌ Error insertando batch ${i}: ${error.message}`);
        // Try individual inserts for this batch
        for (const item of batch) {
          const { error: itemErr } = await supabase
            .from("menu")
            .insert([item]);
          if (!itemErr) insertedCount++;
          else
            addLog(
              `  ⚠️ Fallo individual agente ${(item as Record<string, unknown>).id_agente}: ${itemErr.message}`
            );
        }
      } else {
        insertedCount += batch.length;
      }
    }

    addLog(
      `✅ Persistidos: ${insertedCount}/${allPayload.length} registros en tabla menu`
    );

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        asignaciones: batchPayload.length,
        vacantes: vacantPayload.length,
        insertados: insertedCount,
        log,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Motor error:", err);
    return new Response(
      JSON.stringify({
        error: `Error interno del motor: ${(err as Error).message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
