/**
 * Capacitaciones (caps) builder — clean rebuild.
 *
 * Two paths grant an agent a device capability:
 *   1. Direct attendance  → capacitaciones_participantes.asistio = true
 *   2. RPC convocados matriz → server-side matching via rpc_obtener_convocados_matriz
 *
 * Output: for each resident, caps = { deviceId → earliest ISO date }
 */

import type { ResidentInfo } from '@/types/assignments';

interface CapRow { id_cap: number; id_dia: number; id_turno: number | null; grupo: string | null }
interface PartRow { id_cap: number; id_agente: number; asistio: boolean | null }
interface DispoRow { id_cap: number; id_dispositivo: number }
interface DiaRow { id_dia: number; fecha: string }
interface ResiRow { id_agente: number; nombre: string; apellido: string }
interface ConvocadosMatrizRow { id_cap: number; id_agente: number }

export interface CapsBuilderInput {
  capData: CapRow[];
  partsData: PartRow[];
  dispoData: DispoRow[];
  diasData: DiaRow[];
  resiData: ResiRow[];
  convocadosMatriz?: ConvocadosMatrizRow[];
}

export interface CapsBuilderOutput {
  residentsMap: Record<number, ResidentInfo>;
  agentGroups: Record<string, string>;
}

export function buildResidentCaps(input: CapsBuilderInput): CapsBuilderOutput {
  const { capData, partsData, dispoData, diasData, resiData, convocadosMatriz } = input;

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

  // ── Step 2: Initialize residentsMap ────────────────────────────────
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
    if (!existing || date < existing) {
      residentsMap[agentId].caps[dKey] = date;
    }
  };

  // ── Step 3: Path 1 — Direct attendance ─────────────────────────────
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

  // ── Step 4: Path 2 — RPC convocados matriz ────────────────────────
  let path2Count = 0;

  if (convocadosMatriz && convocadosMatriz.length > 0) {
    convocadosMatriz.forEach(row => {
      const cDate = capDates[row.id_cap];
      const dispos = capDispos[row.id_cap] || [];
      if (capGroups[row.id_cap]) {
        const agId = String(row.id_agente);
        if (!gruposAgenteMap[agId]) gruposAgenteMap[agId] = new Set();
        gruposAgenteMap[agId].add(capGroups[row.id_cap]);
      }
      if (cDate && dispos.length > 0) {
        dispos.forEach(dId => {
          assignCap(row.id_agente, dId, cDate);
          path2Count++;
        });
      }
    });
  }

  // ── Step 5: Build agent groups ─────────────────────────────────────
  const agentGroups: Record<string, string> = {};
  Object.keys(gruposAgenteMap).forEach(k => {
    const grps = Array.from(gruposAgenteMap[k]);
    agentGroups[k] = grps.includes('A') ? 'A' : grps[0];
  });

  // ── Summary ────────────────────────────────────────────────────────
  const totalCaps = Object.values(residentsMap).reduce(
    (sum, r) => sum + Object.keys(r.caps).length, 0
  );
  console.log(
    `[CapsBuilder] ${resiData.length} residents | ` +
    `${capData.length} caps | ${dispoData.length} cap_dispos | ` +
    `Path1(attendance): ${path1Count} | ` +
    `Path2(RPC matriz): ${path2Count} | ` +
    `Total caps: ${totalCaps}`
  );

  return { residentsMap, agentGroups };
}
