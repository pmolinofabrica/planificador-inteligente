/**
 * Capacitaciones (caps) builder — clean rebuild.
 *
 * Two paths grant an agent a device capability:
 *   1. Direct attendance  → capacitaciones_participantes.asistio = true
 *   2. Convocatoria inference → agent is convocated to planificación that
 *      matches a capacitación (same id_dia + id_turno + grupo), UNLESS they
 *      have asistio = false for that specific cap (veto).
 *
 * Output: for each resident, caps = { deviceId → earliest ISO date }
 */

import type { ResidentInfo } from '@/types/assignments';

interface CapRow { id_cap: number; id_dia: number; id_turno: number | null; grupo: string | null }
interface PartRow { id_cap: number; id_agente: number; asistio: boolean | null }
interface DispoRow { id_cap: number; id_dispositivo: number }
interface DiaRow { id_dia: number; fecha: string }
interface ConvRow { id_convocatoria: number; id_agente: number; id_plani: number }
interface PlaniRow { id_plani: number; id_dia: number; id_turno: number; grupo: string | null }
interface ResiRow { id_agente: number; nombre: string; apellido: string }

export interface CapsBuilderInput {
  capData: CapRow[];
  partsData: PartRow[];
  dispoData: DispoRow[];
  diasData: DiaRow[];
  convsData: ConvRow[];
  planisData: PlaniRow[];
  resiData: ResiRow[];
}

export interface CapsBuilderOutput {
  residentsMap: Record<number, ResidentInfo>;
  agentGroups: Record<string, string>;
}

export function buildResidentCaps(input: CapsBuilderInput): CapsBuilderOutput {
  const { capData, partsData, dispoData, diasData, convsData, planisData, resiData } = input;

  // ── Step 1: Build lookup dictionaries ──────────────────────────────
  const diasDict: Record<number, string> = {};
  diasData.forEach(d => { if (d.fecha) diasDict[d.id_dia] = d.fecha.substring(0, 10); });

  const capDates: Record<number, string> = {};
  const capGroups: Record<number, string> = {};
  capData.forEach(c => {
    const realDate = diasDict[c.id_dia];
    if (realDate) capDates[c.id_cap] = realDate;
    if (c.grupo) capGroups[c.id_cap] = c.grupo;
  });

  const capDispos: Record<number, number[]> = {};
  dispoData.forEach(cd => {
    if (!capDispos[cd.id_cap]) capDispos[cd.id_cap] = [];
    capDispos[cd.id_cap].push(cd.id_dispositivo);
  });

  // ── Step 2: Map planificación → capacitación ───────────────────────
  // For each capacitación, find the matching planificación row
  const planiToCap: Record<number, number> = {};
  const capsWithDevices = new Set(Object.keys(capDispos).map(Number));

  capData.forEach(c => {
    const match = planisData.find(p =>
      p.id_dia === c.id_dia &&
      p.id_turno === c.id_turno &&
      ((p.grupo || null) === (c.grupo || null))
    );
    if (match) {
      planiToCap[match.id_plani] = c.id_cap;
    }
    // Debug: trace caps with devices that DON'T find a plani match
    if (capsWithDevices.has(c.id_cap) && !match) {
      console.warn(`[CapsBuilder] ⚠️ Cap ${c.id_cap} (fecha=${capDates[c.id_cap]}, grupo=${c.grupo}, turno=${c.id_turno}) has devices but NO planificación match! id_dia=${c.id_dia}`);
    }
  });

  // Debug: trace planiToCap for caps that have devices
  const capsWithDevicesAndPlani = Object.entries(planiToCap).filter(([_, capId]) => capsWithDevices.has(capId));
  console.log(`[CapsBuilder:step2] planiToCap total=${Object.keys(planiToCap).length} | caps with devices+plani=${capsWithDevicesAndPlani.length}`, capsWithDevicesAndPlani.map(([p, c]) => `plani${p}→cap${c}`));


  // ── Step 3: Build veto map (agents with asistio=false for a cap) ──
  const vetoedMap: Record<string, Set<number>> = {};
  partsData.forEach(p => {
    if (p.asistio === false) {
      const k = String(p.id_agente);
      if (!vetoedMap[k]) vetoedMap[k] = new Set();
      vetoedMap[k].add(p.id_cap);
    }
  });

  // ── Step 4: Initialize residentsMap ────────────────────────────────
  const residentsMap: Record<number, ResidentInfo> = {};
  resiData.forEach(r => {
    residentsMap[r.id_agente] = {
      id: r.id_agente,
      name: `${r.apellido} ${r.nombre}`,
      caps: {},
    };
  });

  // Helper to assign a cap
  const assignCap = (agentId: number, deviceId: number, date: string) => {
    if (!residentsMap[agentId]) return;
    const dKey = String(deviceId);
    const existing = residentsMap[agentId].caps[dKey];
    // Keep the earliest date
    if (!existing || date < existing) {
      residentsMap[agentId].caps[dKey] = date;
    }
  };

  // ── Step 5: Path 1 — Direct attendance ─────────────────────────────
  const gruposAgenteMap: Record<string, Set<string>> = {};
  let path1Count = 0;

  partsData.forEach(p => {
    if (p.asistio !== true) return;
    const cId = p.id_cap;
    const cDate = capDates[cId];
    const dispos = capDispos[cId] || [];
    if (capGroups[cId]) {
      const agId = String(p.id_agente);
      if (!gruposAgenteMap[agId]) gruposAgenteMap[agId] = new Set();
      gruposAgenteMap[agId].add(capGroups[cId]);
    }
    if (cDate) {
      dispos.forEach(dId => {
        assignCap(p.id_agente, dId, cDate);
        path1Count++;
      });
    }
  });

  // ── Step 6: Path 2 — Convocatoria inference ────────────────────────
  let path2Count = 0;
  let path2Skipped = 0;
  let path2NoCapId = 0;
  let path2Vetoed = 0;

  convsData.forEach(cv => {
    const agId = String(cv.id_agente);
    const cId = planiToCap[cv.id_plani];
    if (!cId) { path2NoCapId++; return; }
    if (vetoedMap[agId]?.has(cId)) { path2Vetoed++; return; }
    const cDate = capDates[cId];
    const dispos = capDispos[cId] || [];
    if (capGroups[cId]) {
      if (!gruposAgenteMap[agId]) gruposAgenteMap[agId] = new Set();
      gruposAgenteMap[agId].add(capGroups[cId]);
    }
    if (cDate && dispos.length > 0) {
      dispos.forEach(dId => {
        assignCap(cv.id_agente, dId, cDate);
        path2Count++;
      });
    } else {
      path2Skipped++;
    }
  });

  console.log(`[CapsBuilder:path2] total convs=${convsData.length} noCapId=${path2NoCapId} vetoed=${path2Vetoed} skipped(noDate/noDispos)=${path2Skipped} assigned=${path2Count}`);

  // ── Step 7: Build agent groups ─────────────────────────────────────
  const agentGroups: Record<string, string> = {};
  Object.keys(gruposAgenteMap).forEach(k => {
    const grps = Array.from(gruposAgenteMap[k]);
    agentGroups[k] = grps.includes('A') ? 'A' : grps[0];
  });

  // ── Debug summary ──────────────────────────────────────────────────
  const totalCaps = Object.values(residentsMap).reduce(
    (sum, r) => sum + Object.keys(r.caps).length, 0
  );
  console.log(
    `[CapsBuilder] ${resiData.length} residents | ` +
    `${capData.length} caps | ${dispoData.length} cap_dispos | ` +
    `Path1(attendance): ${path1Count} assignments | ` +
    `Path2(convocatoria): ${path2Count} assignments | ` +
    `Total resident-device caps: ${totalCaps} | ` +
    `planiToCap mappings: ${Object.keys(planiToCap).length}`
  );

  return { residentsMap, agentGroups };
}
