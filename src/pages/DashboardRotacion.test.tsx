import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("recharts", () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    BarChart: Stub, Bar: Stub, XAxis: Stub, YAxis: Stub, CartesianGrid: Stub,
    Tooltip: Stub, ResponsiveContainer: Stub, Cell: Stub,
  };
});

vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));

const RESIDENTES = [
  { id_agente: 1, nombre: "Ana", apellido: "Perez" },
  { id_agente: 2, nombre: "Luis", apellido: "Gomez" },
];
const DISPOSITIVOS = [
  { id_dispositivo: 10, nombre_dispositivo: "Sala A", piso_dispositivo: 1 },
  { id_dispositivo: 11, nombre_dispositivo: "Sala B", piso_dispositivo: 1 },
];
const TURNOS = [{ id_turno: 1, tipo_turno: "Apertura" }, { id_turno: 2, tipo_turno: "Turno Mañana" }];

/** Filas crudas de `menu`: 3 coordinaciones de apertura. */
const MENU = [
  { id_agente: 1, id_dispositivo: 10, fecha_asignacion: "2026-03-01" },
  { id_agente: 1, id_dispositivo: 11, fecha_asignacion: "2026-03-02" },
  { id_agente: 2, id_dispositivo: 10, fecha_asignacion: "2026-03-01" },
];
/** Filas crudas de `menu_semana` (turno 2): 2 coordinaciones. */
const MENU_SEMANA = [
  { id_agente: 1, id_dispositivo: 11, fecha_asignacion: "2026-03-01" },
  { id_agente: 2, id_dispositivo: 11, fecha_asignacion: "2026-03-02" },
];

/** Registra cada `.range()` por tabla, para comprobar que se paginan. */
const rangeCalls: Record<string, Array<[number, number]>> = {};

/**
 * Builder de Supabase mínimo. Encadena filtros y recuerda cuáles se aplicaron,
 * porque `menu` sirve tanto para las asignaciones como para el filtro
 * `acompaña_grupo` y cada una necesita filas distintas.
 */
type Builder = Record<string, (...args: never[]) => unknown>;

function builder(table: string) {
  const state: { acompana: boolean; turnoIds: number[] } = { acompana: false, turnoIds: [] };
  const key = () => (state.acompana ? `acompana_${table}` : table);
  const self = {
    select: () => self,
    eq: (col: string, val: unknown) => {
      if (col === "acompaña_grupo") state.acompana = val === true;
      return self;
    },
    neq: () => self,
    gte: () => self,
    lte: () => self,
    in: (_col: string, vals: number[]) => { state.turnoIds = vals; return self; },
    not: () => self,
    order: () => self,
    range: async (from: number, to: number) => {
      (rangeCalls[key()] ??= []).push([from, to]);
      return { data: pageRows(table, state, from), error: null };
    },
    then: (res: (v: unknown) => unknown) =>
      Promise.resolve({ data: pageRows(table, state, 0), error: null }).then(res),
  };
  return self as unknown as Builder;
}

/**
 * Relleno que supera el tope de 1000 filas de PostgREST. Usa `id_agente: 999`,
 * que no está en la cohorte activa, así el dashboard lo descarta al filtrar y
 * no altera los conteos que verifica el test del KPI.
 */
const FILLER = Array.from({ length: 1500 }, (_, i) => ({
  id_agente: 999,
  id_dispositivo: 999,
  fecha_asignacion: `2026-06-${String((i % 28) + 1).padStart(2, "0")}`,
}));

const PAGE = 1000;

function resolveRows(table: string, state: { acompana: boolean; turnoIds: number[] }) {
  if (table === "datos_personales") return RESIDENTES;
  if (table === "dispositivos") return DISPOSITIVOS;
  if (table === "turnos") return TURNOS;
  if (table === "menu") return state.acompana ? FILLER : [...MENU, ...FILLER];
  if (table === "menu_semana") {
    if (state.acompana) return FILLER;
    // El dashboard filtra menu_semana por los id_turno cuyo tipo contiene "turno".
    return state.turnoIds.length ? [...MENU_SEMANA, ...FILLER] : [];
  }
  if (table === "vista_agentes_capacitados") return FILLER;
  if (table === "vista_convocatoria_completa" || table === "inasistencias") return FILLER;
  return [];
}

/** Simula el corte de PostgREST: cada `.range()` devuelve como máximo 1000 filas. */
function pageRows(table: string, state: { acompana: boolean; turnoIds: number[] }, from: number) {
  return resolveRows(table, state).slice(from, from + PAGE);
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (table: string) => builder(table) },
}));

import DashboardRotacion from "./DashboardRotacion";

/** Texto de la card de KPI con ese título. */
function metricValue(label: string) {
  const title = screen.getByText(label);
  const card = title.closest("div")?.parentElement?.parentElement;
  return card?.textContent ?? "";
}

describe("DashboardRotacion - KPI de asignaciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(rangeCalls)) delete rangeCalls[k];
  });

  it("cuenta el año completo y recalcula el KPI al cambiar de turno", async () => {
    render(<DashboardRotacion />);
    await waitFor(() => expect(screen.getByText("Asignaciones FDS")).toBeInTheDocument());

    // Apertura (tabla menu): 3 coordinaciones.
    expect(metricValue("Asignaciones FDS")).toContain("3");

    // T/M (tabla menu_semana): 2 coordinaciones. Con deps solo [data] en el
    // useMemo de globalMetrics el KPI seguía mostrando 3.
    fireEvent.click(screen.getByText("T/M"));
    await waitFor(() => expect(screen.getByText("Asignaciones T/M")).toBeInTheDocument());
    expect(metricValue("Asignaciones T/M")).toContain("2");
    expect(metricValue("Asignaciones T/M")).not.toContain("3");

    // Total: 3 + 2 = 5.
    fireEvent.click(screen.getByText("Total"));
    await waitFor(() => expect(screen.getByText("Asignaciones Totales")).toBeInTheDocument());
    expect(metricValue("Asignaciones Totales")).toContain("5");

    // Volver a apertura repone 3.
    fireEvent.click(screen.getByText("Ap"));
    await waitFor(() => expect(screen.getByText("Asignaciones FDS")).toBeInTheDocument());
    expect(metricValue("Asignaciones FDS")).toContain("3");
  });

  it("pide la segunda página en todas las consultas que pueden superar las 1000 filas", async () => {
    render(<DashboardRotacion />);
    await waitFor(() => expect(screen.getByText("Asignaciones FDS")).toBeInTheDocument());

    // Regresión: estas consultas son anuales y en producción superan el tope de
    // 1000 filas de PostgREST (menu 1708, menu_semana 1656,
    // vista_convocatoria_completa 5892). Si alguien vuelve a quitarles la
    // paginación, dejan de pedir la página 1000-1999 y aquí falla.
    const paginadas = [
      "menu",
      "menu_semana",
      "vista_agentes_capacitados",
      "vista_convocatoria_completa",
      "inasistencias",
    ];

    for (const table of paginadas) {
      expect(rangeCalls[table] ?? [], `tabla ${table} sin paginación`).toContainEqual([1000, 1999]);
    }
  });

  it("pide la segunda página también en las consultas de acompaña_grupo", async () => {
    render(<DashboardRotacion />);
    await waitFor(() => expect(screen.getByText("Asignaciones FDS")).toBeInTheDocument());

    expect(rangeCalls.acompana_menu ?? []).toContainEqual([1000, 1999]);
    expect(rangeCalls.acompana_menu_semana ?? []).toContainEqual([1000, 1999]);
  });
});