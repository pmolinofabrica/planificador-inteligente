import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RefreshCw, Activity, Users, Map as MapIcon, Award, Calendar, ArrowLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

// Types
interface Residente { id_agente: number; nombre_completo: string; }
interface Dispositivo { id_dispositivo: number; nombre_dispositivo: string; piso_dispositivo: number; }
interface Asignacion { id_agente: number; id_dispositivo: number; fecha_asignacion: string; }
interface Capacitacion { id_agente: number; id_dispositivo: number; fecha_capacitacion: string; }

interface AcompanaEntry { id_agente: number; fecha_asignacion: string; }

// Status Maps
type StatusMap = Record<string, Record<number, string>>; // { "YYYY-MM-DD": { agenteId: "descanso" | "inasistencia" | "convocatoria" } }

export default function DashboardRotacion() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    residentes: Residente[];
    dispositivos: Dispositivo[];
    asignaciones: Asignacion[];
    tmAsignaciones: Asignacion[];
    capacitaciones: Capacitacion[];
    statusMap: StatusMap;
    tmStatusMap: StatusMap;
    acompanaList: AcompanaEntry[];
  } | null>(null);

  const [turnoMode, setTurnoMode] = useState<'apertura' | 'tm' | 'total'>('apertura');
  const [selectedResidenteId, setSelectedResidenteId] = useState<string>("all");
  const [selectedDispositivoId, setSelectedDispositivoId] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [showDiversidadModal, setShowDiversidadModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Cargar Residentes
      const { data: resData, error: err1 } = await supabase
        .from("datos_personales")
        .select("id_agente, nombre, apellido")
        .eq("cohorte", 2026)
        .eq("activo", true);
      if (err1) throw err1;
      
      const residentes = (resData || []).map(r => ({
        id_agente: r.id_agente,
        nombre_completo: `${r.apellido}, ${r.nombre}`
      }));
      const resIds = new Set(residentes.map(r => r.id_agente));

      // 2. Cargar Dispositivos
      const { data: dispData, error: err2 } = await supabase
        .from("dispositivos")
        .select("id_dispositivo, nombre_dispositivo, piso_dispositivo")
        .eq("activo", true)
        .neq("id_dispositivo", 999);
      if (err2) throw err2;
      const dispositivos = dispData || [];
      const dispIds = new Set(dispositivos.map(d => d.id_dispositivo));

      // 3. Cargar Asignaciones (Filtrado en JS para FDS para no ahogar Supabase con filtros complejos)
      const { data: asigData, error: err3 } = await supabase
        .from("menu")
        .select("id_agente, id_dispositivo, fecha_asignacion")
        .gte("fecha_asignacion", "2026-01-01")
        .lte("fecha_asignacion", "2026-12-31")
        .not("id_dispositivo", "is", null);
      if (err3) throw err3;

      const asignaciones = (asigData || []).filter(a => {
        if (!a.fecha_asignacion || !resIds.has(a.id_agente) || !dispIds.has(a.id_dispositivo)) return false;
        const dow = new Date(a.fecha_asignacion).getUTCDay();
        return dow === 0 || dow === 6;
      }).map(a => ({ id_agente: a.id_agente, id_dispositivo: a.id_dispositivo, fecha_asignacion: a.fecha_asignacion.split("T")[0] }));

      // 3b. Cargar datos T/M (Turno Mañana/Tarde) - consulta optimizada con filtro por id_turno
      const { data: turnosAll } = await supabase.from("turnos").select("id_turno, tipo_turno");
      const tmIds = (turnosAll || []).filter(t => t.tipo_turno?.toLowerCase().includes('turno')).map(t => t.id_turno);
      let tmAsignaciones: Asignacion[] = [];
      if (tmIds.length > 0) {
        const { data: tmRaw } = await supabase
          .from("menu_semana")
          .select("id_agente, id_dispositivo, fecha_asignacion")
          .in("id_turno", tmIds)
          .gte("fecha_asignacion", "2026-01-01")
          .lte("fecha_asignacion", "2026-12-31")
          .not("id_dispositivo", "is", null);
        tmAsignaciones = (tmRaw || [])
          .filter(a => resIds.has(a.id_agente) && dispIds.has(a.id_dispositivo))
          .map(a => ({ id_agente: a.id_agente, id_dispositivo: a.id_dispositivo, fecha_asignacion: a.fecha_asignacion.split("T")[0] }));
      }

      // 4. Cargar Capacitaciones
      const { data: capData, error: err4 } = await supabase
        .from("vista_agentes_capacitados")
        .select("id_agente, id_dispositivo, fecha_capacitacion");
      if (err4) throw err4;
      
      const capacitaciones = (capData || [])
        .filter(c => resIds.has(c.id_agente) && dispIds.has(c.id_dispositivo))
        .map(c => ({ 
          id_agente: c.id_agente, 
          id_dispositivo: c.id_dispositivo, 
          fecha_capacitacion: c.fecha_capacitacion 
        }));

      // 5. Cargar estados (Inasistencias, Convocatorias) para FDS 2026
      const { data: inasData } = await supabase.from("inasistencias").select("id_agente, fecha_inasistencia").eq("6ta_tardanza", false).gte("fecha_inasistencia", "2026-01-01").lte("fecha_inasistencia", "2026-12-31");
      const { data: convData } = await supabase.from("vista_convocatoria_completa").select("id_agente, fecha_turno, tipo_turno").eq("anio", 2026).neq("estado", "cancelada");

      const addStatus = (map: StatusMap, dateStr: string, agent: number, status: string) => {
        const date = dateStr.split("T")[0]; // Evitar diferencias por huso horario (timestamps)
        if (!map[date]) map[date] = {};
        // Prioridad: Inasistencia > Convocatoria
        if (!map[date][agent] || status === "inasistencia") {
          map[date][agent] = status;
        }
      };

      const statusMap: StatusMap = {};
      const tmStatusMap: StatusMap = {};
      (convData || []).forEach(c => {
        if (!c.fecha_turno) return;
        const aperturaStatus = c.tipo_turno?.toLowerCase().includes("apertura") ? "convocatoria" : "descanso";
        addStatus(statusMap, c.fecha_turno, c.id_agente, aperturaStatus);
        const tmStatus = c.tipo_turno?.toLowerCase().includes('turno') ? "convocatoria" : "descanso";
        addStatus(tmStatusMap, c.fecha_turno, c.id_agente, tmStatus);
      });
      (inasData || []).forEach(i => {
        if (i.fecha_inasistencia) {
          addStatus(statusMap, i.fecha_inasistencia, i.id_agente, "inasistencia");
          addStatus(tmStatusMap, i.fecha_inasistencia, i.id_agente, "inasistencia");
        }
      });

      // 6. Cargar datos de acompaña_grupo (menu + menu_semana)
      const [acompMenu, acompSemana] = await Promise.all([
        supabase.from("menu").select("id_agente, fecha_asignacion").eq("acompaña_grupo", true).gte("fecha_asignacion", "2026-01-01").lte("fecha_asignacion", "2026-12-31"),
        supabase.from("menu_semana").select("id_agente, fecha_asignacion").eq("acompaña_grupo", true).gte("fecha_asignacion", "2026-01-01").lte("fecha_asignacion", "2026-12-31"),
      ]);
      const acompanaList: AcompanaEntry[] = [];
      const seen = new Set<string>();
      const dedup = (row: { id_agente: number; fecha_asignacion: string | null }) => {
        if (!row.fecha_asignacion) return;
        const date = row.fecha_asignacion.split("T")[0];
        if (!resIds.has(row.id_agente)) return;
        const key = `${row.id_agente}-${date}`;
        if (seen.has(key)) return;
        seen.add(key);
        acompanaList.push({ id_agente: row.id_agente, fecha_asignacion: date });
      };
      (acompMenu?.data || []).forEach(dedup);
      (acompSemana?.data || []).forEach(dedup);

      setData({ residentes, dispositivos, asignaciones, tmAsignaciones, capacitaciones, statusMap, tmStatusMap, acompanaList });
      toast.success("Datos actualizados correctamente desde Supabase.");
    } catch (error: any) {
      console.error(error);
      toast.error("Error al cargar datos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "S/F";
    try {
      return format(parseISO(dateStr), "dd/MM/yy", { locale: es });
    } catch (e) {
      return dateStr;
    }
  };

  const { residentes, dispositivos, asignaciones: aperturaAsignaciones, tmAsignaciones, capacitaciones, statusMap: aperturaStatusMap, tmStatusMap, acompanaList } = data || {
    residentes: [], dispositivos: [], asignaciones: [], tmAsignaciones: [], capacitaciones: [], statusMap: {}, tmStatusMap: {}, acompanaList: []
  };

  const asignaciones = useMemo(() => {
    if (turnoMode === 'apertura') return aperturaAsignaciones;
    if (turnoMode === 'tm') return tmAsignaciones;
    return aperturaAsignaciones.concat(tmAsignaciones);
  }, [turnoMode, aperturaAsignaciones, tmAsignaciones]);

  const statusMap = useMemo(() => {
    if (turnoMode === 'apertura') return aperturaStatusMap;
    if (turnoMode === 'tm') return tmStatusMap;
    const merged: StatusMap = {};
    for (const map of [aperturaStatusMap, tmStatusMap]) {
      for (const [date, agents] of Object.entries(map)) {
        if (!merged[date]) merged[date] = {};
        for (const [agentId, status] of Object.entries(agents)) {
          const aId = Number(agentId);
          if (!merged[date][aId] || status === 'inasistencia') {
            merged[date][aId] = status;
          }
        }
      }
    }
    return merged;
  }, [turnoMode, aperturaStatusMap, tmStatusMap]);

  const datesApertura = useMemo(() => {
    const dates = new Set<string>();
    asignaciones.forEach(a => dates.add(a.fecha_asignacion));
    return Array.from(dates).sort();
  }, [asignaciones]);

  const dispMap = useMemo(() => new Map(dispositivos.map(d => [d.id_dispositivo, d])), [dispositivos]);
  const resMap = useMemo(() => new Map(residentes.map(r => [r.id_agente, r])), [residentes]);

  const acompanaMap = useMemo(() => {
    const map = new Map<number, { count: number; dates: string[] }>();
    acompanaList.forEach(a => {
      if (!map.has(a.id_agente)) map.set(a.id_agente, { count: 0, dates: [] });
      const entry = map.get(a.id_agente)!;
      entry.count++;
      if (!entry.dates.includes(a.fecha_asignacion)) entry.dates.push(a.fecha_asignacion);
    });
    return map;
  }, [acompanaList]);

  // --- Capa 3: Métricas Globales ---
  const globalMetrics = useMemo(() => {
    if (!data) return null;
    const totalAsignaciones = asignaciones.length;
    const totalDispositivosActivos = dispositivos.length;
    
    let sumDiversidad = 0;
    const rankingDiversidad = residentes.map(res => {
      const dispUnicos = new Set(asignaciones.filter(a => a.id_agente === res.id_agente).map(a => a.id_dispositivo));
      const diversidad = totalDispositivosActivos > 0 ? (dispUnicos.size / totalDispositivosActivos) * 100 : 0;
      sumDiversidad += diversidad;
      return { 
        residente: res.nombre_completo, 
        diversidad, 
        unicos: dispUnicos.size 
      };
    }).sort((a,b) => b.diversidad - a.diversidad);

    const diversidadGlobal = residentes.length > 0 ? (sumDiversidad / residentes.length) : 0;

    return {
      totalAsignaciones,
      diversidadGlobal: diversidadGlobal.toFixed(1) + "%",
      totalResidentes: residentes.length,
      totalDispositivos: totalDispositivosActivos,
      rankingDiversidad
    };
  }, [data]);

  // --- Capa 1: Residente ---
  const residenteStats = useMemo(() => {
    if (selectedResidenteId === "all") return null;
    const rId = parseInt(selectedResidenteId);

    const misAsigApertura = aperturaAsignaciones.filter(a => a.id_agente === rId);
    const misAsigTm = tmAsignaciones.filter(a => a.id_agente === rId);
    const misAsig = turnoMode === 'apertura' ? misAsigApertura : turnoMode === 'tm' ? misAsigTm : [...misAsigApertura, ...misAsigTm];
    const conteoPorDisp = new Map<number, number>();
    misAsig.forEach(a => conteoPorDisp.set(a.id_dispositivo, (conteoPorDisp.get(a.id_dispositivo) || 0) + 1));

    const porPisoObj: Record<string, number> = {};
    conteoPorDisp.forEach((count, dId) => {
      const piso = dispMap.get(dId)?.piso_dispositivo?.toString() || "Otro";
      porPisoObj[`Piso ${piso}`] = (porPisoObj[`Piso ${piso}`] || 0) + count;
    });
    const chartPorPiso = Object.entries(porPisoObj).map(([piso, count]) => ({ piso, cantidad: count })).sort((a,b) => a.piso.localeCompare(b.piso));

    // Per-piso split for Total mode
    const porPisoAp: Record<string, number> = {};
    const porPisoTm: Record<string, number> = {};
    misAsigApertura.forEach(a => {
      const piso = dispMap.get(a.id_dispositivo)?.piso_dispositivo?.toString() || "Otro";
      porPisoAp[`Piso ${piso}`] = (porPisoAp[`Piso ${piso}`] || 0) + 1;
    });
    misAsigTm.forEach(a => {
      const piso = dispMap.get(a.id_dispositivo)?.piso_dispositivo?.toString() || "Otro";
      porPisoTm[`Piso ${piso}`] = (porPisoTm[`Piso ${piso}`] || 0) + 1;
    });
    const allPisos = new Set([...Object.keys(porPisoAp), ...Object.keys(porPisoTm)]);
    const chartPorPisoSplit = turnoMode === 'total'
      ? Array.from(allPisos).sort().map(piso => ({ piso, ap: porPisoAp[piso] || 0, tm: porPisoTm[piso] || 0 }))
      : undefined;

    const listaTop = Array.from(conteoPorDisp.entries())
      .map(([dId, count]) => ({ dispositivo: dispMap.get(dId)?.nombre_dispositivo || "Desc.", cantidad: count }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const misCaps = new Set(capacitaciones.filter(c => c.id_agente === rId).map(c => c.id_dispositivo));
    const dispCoordinados = new Set(conteoPorDisp.keys());
    
    const capNoCoordPorPiso: Record<string, string[]> = {};
    Array.from(misCaps).forEach(dId => {
      if (!dispCoordinados.has(dId)) {
        const d = dispMap.get(dId);
        if (d) {
          const p = `Piso ${d.piso_dispositivo}`;
          if (!capNoCoordPorPiso[p]) capNoCoordPorPiso[p] = [];
          capNoCoordPorPiso[p].push(d.nombre_dispositivo);
        }
      }
    });

    const diversidad = ((dispCoordinados.size / (dispositivos.length || 1)) * 100).toFixed(1) + "%";

    const acomp = acompanaMap.get(rId);
    const acompanaCount = acomp?.count || 0;
    const acompanaDates = acomp?.dates ? [...acomp.dates].sort() : [];

    return { chartPorPiso, chartPorPisoSplit, listaTop, capNoCoordPorPiso, totalAsig: misAsig.length, unicos: dispCoordinados.size, diversidad, acompanaCount, acompanaDates };
  }, [selectedResidenteId, turnoMode, aperturaAsignaciones, tmAsignaciones, capacitaciones, dispMap, dispositivos.length, acompanaMap]);

  // --- Capa 2: Dispositivo ---
  const dispositivoStats = useMemo(() => {
    if (selectedDispositivoId === "all") return null;
    const dId = parseInt(selectedDispositivoId);

    const asigAqui = asignaciones.filter(a => a.id_dispositivo === dId);
    const conteoPorRes = new Map<number, number>();
    asigAqui.forEach(a => conteoPorRes.set(a.id_agente, (conteoPorRes.get(a.id_agente) || 0) + 1));

    const capDateMap = new Map<number, string>();
    capacitaciones.filter(c => c.id_dispositivo === dId).forEach(c => capDateMap.set(c.id_agente, c.fecha_capacitacion));

    const listaTopRes = Array.from(conteoPorRes.entries())
      .map(([rId, count]) => ({ 
        rId,
        residente: resMap.get(rId)?.nombre_completo || "Desc.", 
        cantidad: count,
        fechaCap: capDateMap.get(rId)
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const resCapacitados = new Set(capacitaciones.filter(c => c.id_dispositivo === dId).map(c => c.id_agente));
    const resCoordinaron = new Set(conteoPorRes.keys());
    
    const capacitadosNoCoordinaron = Array.from(resCapacitados)
      .filter(rId => !resCoordinaron.has(rId))
      .map(rId => ({
        rId,
        residente: resMap.get(rId)?.nombre_completo || "Desc.",
        fechaCap: capDateMap.get(rId)
      }));

    return { listaTopRes, capacitadosNoCoordinaron, totalAsig: asigAqui.length };
  }, [selectedDispositivoId, asignaciones, capacitaciones, resMap]);

  const getAgentFormat = (agenteId: number) => {
    if (selectedDate === "all") return "";
    const st = statusMap[selectedDate]?.[agenteId];
    if (st === "inasistencia") return "line-through text-red-500 decoration-red-500 font-bold bg-red-50 p-1 rounded";
    if (st === "convocatoria") return "font-bold text-blue-700 bg-blue-50 ring-1 ring-blue-200 p-1 rounded shadow-sm";
    
    // Si la fecha está filtrada y el residente no tiene inasistencia ni convocatoria,
    // significa que está en DESCANSO para ese día.
    return "text-gray-400 bg-gray-50 italic p-1 rounded";
  };


  if (!data && loading) return <div className="p-8 flex justify-center"><RefreshCw className="animate-spin w-8 h-8 text-primary" /></div>;

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl animate-in fade-in zoom-in-95 duration-500">
      
      {/* HEADER ROW */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl shadow-sm border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <Button 
            onClick={() => navigate('/')} 
            className="shrink-0 shadow-md font-bold flex items-center gap-2 rounded-xl transition-all hover:scale-105 bg-slate-800 text-white hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Panel
          </Button>
          <div className="border-l-2 border-border pl-0 sm:pl-6">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
              Rotaciones dispositivos
            </h1>
            <p className="text-muted-foreground mt-1">
              Cohorte 2026 - {turnoMode === 'apertura' ? 'Asignaciones Apertura (FDS)' : turnoMode === 'tm' ? 'Asignaciones Turno Mañana/Tarde' : 'Asignaciones Totales (Ap + T/M)'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ToggleGroup
            type="single"
            value={turnoMode}
            onValueChange={(v) => { if (v) setTurnoMode(v as 'apertura' | 'tm' | 'total'); }}
            className="bg-slate-100 p-1 rounded-lg border shadow-sm"
          >
            <ToggleGroupItem value="apertura" className="text-xs font-medium px-3 data-[state=on]:bg-blue-600 data-[state=on]:text-white data-[state=on]:shadow-sm rounded-md">
              Ap
            </ToggleGroupItem>
            <ToggleGroupItem value="total" className="text-xs font-medium px-3 data-[state=on]:bg-slate-700 data-[state=on]:text-white data-[state=on]:shadow-sm rounded-md">
              Total
            </ToggleGroupItem>
            <ToggleGroupItem value="tm" className="text-xs font-medium px-3 data-[state=on]:bg-amber-600 data-[state=on]:text-white data-[state=on]:shadow-sm rounded-md">
              T/M
            </ToggleGroupItem>
          </ToggleGroup>
          {datesApertura.length > 0 && (
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger className="w-[180px] bg-white border-primary/20 shadow-sm">
                <Calendar className="w-4 h-4 mr-2 text-primary" />
                <SelectValue placeholder="Fecha..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fechas</SelectItem>
                {datesApertura.map(d => (
                  <SelectItem key={d} value={d}>{formatDate(d)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={loadData} disabled={loading} className="shadow-md transition-all hover:scale-105">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Sincronizando...' : 'Actualizar Datos'}
          </Button>
        </div>
      </div>

      {/* METRICAS GLOBALES (CAPA 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{turnoMode === 'apertura' ? 'Asignaciones FDS' : turnoMode === 'tm' ? 'Asignaciones T/M' : 'Asignaciones Totales'}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalMetrics?.totalAsignaciones || 0}</div>
            <p className="text-xs text-muted-foreground">En el año 2026</p>
          </CardContent>
        </Card>
        
        {/* CLICKABLE DIVERSIDAD GRUPAL */}
        <Card 
          className="shadow-sm border-l-4 border-l-green-500 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setShowDiversidadModal(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Diversidad Grupal</CardTitle>
            <MapIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{globalMetrics?.diversidadGlobal || "0%"}</div>
            <p className="text-xs text-green-600/80">Clic para ver ranking</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Residentes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalMetrics?.totalResidentes || 0}</div>
            <p className="text-xs text-muted-foreground">Cohorte 2026 Activos</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dispositivos</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalMetrics?.totalDispositivos || 0}</div>
            <p className="text-xs text-muted-foreground">Operativos</p>
          </CardContent>
        </Card>
      </div>

      {/* TABS PRINCIPALES */}
      <Tabs defaultValue="residente" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
          <TabsTrigger value="residente" className="text-base font-medium">Capa 1: Análisis por Residente</TabsTrigger>
          <TabsTrigger value="dispositivo" className="text-base font-medium">Capa 2: Análisis por Dispositivo</TabsTrigger>
        </TabsList>

        {/* --- TAB RESIDENTE --- */}
        <TabsContent value="residente" className="space-y-6">
          <Card className="shadow-md">
            <CardHeader className="bg-muted/30 pb-4 border-b">
              <CardTitle>Filtro de Residente</CardTitle>
              <CardDescription>Selecciona un residente para ver sus métricas específicas de rotación.</CardDescription>
              <div className="mt-4">
                <Select value={selectedResidenteId} onValueChange={setSelectedResidenteId}>
                  <SelectTrigger className="w-full md:w-[300px] bg-background">
                    <SelectValue placeholder="Seleccionar residente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">-- Seleccionar Residente --</SelectItem>
                    {residentes.map(r => (
                      <SelectItem key={r.id_agente} value={r.id_agente.toString()}>{r.nombre_completo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            {residenteStats ? (
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                   <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex flex-col justify-center items-center text-center">
                      <span className="text-sm font-semibold text-blue-600 mb-1">Total Asignaciones</span>
                      <span className="text-3xl font-bold text-blue-900">{residenteStats.totalAsig}</span>
                   </div>
                   <div className="bg-green-50/50 p-4 rounded-lg border border-green-100 flex flex-col justify-center items-center text-center">
                      <span className="text-sm font-semibold text-green-600 mb-1">Dispositivos Únicos</span>
                      <span className="text-3xl font-bold text-green-900">{residenteStats.unicos}</span>
                   </div>
                   <div className="bg-purple-50/50 p-4 rounded-lg border border-purple-100 flex flex-col justify-center items-center text-center">
                      <span className="text-sm font-semibold text-purple-600 mb-1">Nivel de Diversidad</span>
                      <span className="text-3xl font-bold text-purple-900">{residenteStats.diversidad}</span>
                   </div>
                   <div className="bg-pink-50/50 p-4 rounded-lg border border-pink-100 flex flex-col justify-center items-center text-center">
                      <span className="text-sm font-semibold text-pink-600 mb-1">🏫 Acompaña Grupo</span>
                      <span className="text-3xl font-bold text-pink-900">{residenteStats.acompanaCount}</span>
                      {residenteStats.acompanaCount > 0 && (
                        <span className="text-[10px] text-pink-500 mt-1">
                          {residenteStats.acompanaDates.length} fechas
                        </span>
                      )}
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  {/* Gráfico y Oportunidades Perdidas */}
                  <div className="border rounded-xl p-4 bg-white shadow-sm flex flex-col h-full">
                    <h3 className="font-semibold text-lg mb-4 text-slate-800">Coordinaciones según Piso</h3>
                    <div className="h-[250px] w-full mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        {residenteStats.chartPorPisoSplit ? (
                          <BarChart data={residenteStats.chartPorPisoSplit} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="piso" axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                            <RechartsTooltip
                              cursor={{fill: '#F1F5F9'}}
                              contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                              formatter={(value: number, name: string) => [value, name === 'Ap' ? 'Apertura' : 'T/M']}
                            />
                            <Bar dataKey="ap" stackId="a" fillOpacity={0.35} radius={[0, 0, 0, 0]} barSize={40} name="Ap">
                              {residenteStats.chartPorPisoSplit.map((entry, index) => (
                                <Cell key={`ap-${index}`} fill={['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'][index % 5]} />
                              ))}
                            </Bar>
                            <Bar dataKey="tm" stackId="a" radius={[4, 4, 0, 0]} barSize={40} name="T/M">
                              {residenteStats.chartPorPisoSplit.map((entry, index) => (
                                <Cell key={`tm-${index}`} fill={['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'][index % 5]} />
                              ))}
                            </Bar>
                          </BarChart>
                        ) : (
                          <BarChart data={residenteStats.chartPorPiso} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="piso" axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                            <RechartsTooltip cursor={{fill: '#F1F5F9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                            <Bar dataKey="cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40}>
                              {residenteStats.chartPorPiso.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'][index % 5]} />
                              ))}
                            </Bar>
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-auto border-t pt-4">
                      <h4 className="font-semibold text-red-700 text-sm mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span> Dispositivos capacitados sin coordinar
                      </h4>
                      
                      {Object.keys(residenteStats.capNoCoordPorPiso).length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {Object.entries(residenteStats.capNoCoordPorPiso).map(([piso, disps]) => (
                            <div key={piso} className="text-sm bg-red-50 p-3 rounded-lg border border-red-100 shadow-sm">
                              <span className="font-bold text-red-800 block mb-1.5">{piso}</span>
                              <ul className="list-disc pl-4 text-red-600/90 text-xs space-y-0.5">
                                {disps.map((d, i) => <li key={i}>{d}</li>)}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-green-50 text-green-700 p-3 rounded-lg border border-green-200 text-sm">
                          <span className="font-semibold">¡Excelente rotación!</span> Ha coordinado en todos los dispositivos donde se capacitó.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lista TOP Full Height */}
                  <div className="border rounded-xl p-0 bg-white shadow-sm overflow-hidden flex flex-col h-[500px]">
                    <div className="bg-slate-50 p-4 border-b border-slate-100 font-semibold text-slate-800">
                      Top Dispositivos Coordinados
                    </div>
                    <ScrollArea className="flex-1">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead>Dispositivo</TableHead>
                            <TableHead className="text-right">Veces</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {residenteStats.listaTop.length > 0 ? residenteStats.listaTop.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{item.dispositivo}</TableCell>
                              <TableCell className="text-right"><Badge variant="secondary">{item.cantidad}</Badge></TableCell>
                            </TableRow>
                          )) : (
                            <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground h-32">No hay asignaciones</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>

                </div>

                {residenteStats.acompanaCount > 0 && (
                  <div className="border rounded-xl p-5 bg-pink-50/30 shadow-sm border-pink-100">
                    <h3 className="font-semibold text-pink-800 mb-3 flex items-center gap-2">
                      🏫 Historial de Acompaña Grupo ({residenteStats.acompanaCount} veces)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {residenteStats.acompanaDates.map((date, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-pink-200 text-xs font-medium text-pink-700 shadow-sm">
                          {formatDate(date)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            ) : (
              <CardContent className="p-12 text-center text-muted-foreground bg-slate-50 border-t">
                Selecciona un residente en el menú superior para ver su información.
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* --- TAB DISPOSITIVO --- */}
        <TabsContent value="dispositivo" className="space-y-6">
          <Card className="shadow-md">
             <CardHeader className="bg-muted/30 pb-4 border-b">
              <CardTitle>Filtro de Dispositivo</CardTitle>
              <CardDescription>Selecciona un dispositivo para ver quiénes lo coordinan más.</CardDescription>
              <div className="mt-4">
                <Select value={selectedDispositivoId} onValueChange={setSelectedDispositivoId}>
                  <SelectTrigger className="w-full md:w-[300px] bg-background">
                    <SelectValue placeholder="Seleccionar dispositivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">-- Seleccionar Dispositivo --</SelectItem>
                    {[...dispositivos].sort((a, b) => a.piso_dispositivo - b.piso_dispositivo || a.nombre_dispositivo.localeCompare(b.nombre_dispositivo)).map(d => (
                      <SelectItem key={d.id_dispositivo} value={d.id_dispositivo.toString()}
                        className={d.piso_dispositivo === 1 ? 'bg-[hsl(var(--floor-1-bg))]' : d.piso_dispositivo === 2 ? 'bg-[hsl(var(--floor-2-bg))]' : d.piso_dispositivo === 3 ? 'bg-[hsl(var(--floor-3-bg))]' : ''}>
                        {d.nombre_dispositivo} (Piso {d.piso_dispositivo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            {dispositivoStats ? (
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Lista TOP Residentes */}
                  <div className="border rounded-xl p-0 bg-white shadow-sm overflow-hidden flex flex-col h-[500px]">
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                      <span className="font-semibold text-slate-800">Top Residentes Coordinadores</span>
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">{dispositivoStats.totalAsig} Asig. Totales</Badge>
                    </div>
                    <ScrollArea className="flex-1">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50 sticky top-0 shadow-sm">
                            <TableHead>Residente</TableHead>
                            <TableHead className="text-center w-[100px]">Capacitado</TableHead>
                            <TableHead className="text-right w-[100px]">Veces</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dispositivoStats.listaTopRes.length > 0 ? dispositivoStats.listaTopRes.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium leading-tight">
                                <span className={getAgentFormat(Number(item.rId || 0))}>
                                  {item.residente}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center text-xs text-muted-foreground gap-1 bg-slate-100 py-1 px-2 rounded-md">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(item.fechaCap)}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-12 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                    <div className="h-full bg-blue-500" style={{width: `${(item.cantidad / (dispositivoStats.listaTopRes[0].cantidad || 1)) * 100}%`}}></div>
                                  </div>
                                  <span className="w-5 font-bold">{item.cantidad}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )) : (
                            <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground h-32">Nadie fue asignado a este dispositivo{turnoMode !== 'total' ? ` en ${turnoMode === 'apertura' ? 'FDS' : 'T/M'}` : ''}</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>

                  {/* Faltantes */}
                  <div className="border rounded-xl p-5 bg-orange-50/50 shadow-sm border-orange-100 flex flex-col h-[500px]">
                    <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      Residentes capacitados sin coordinar
                    </h3>
                    
                    <ScrollArea className="flex-1 pr-4">
                      <div className="flex flex-col gap-3">
                        {dispositivoStats.capacitadosNoCoordinaron.length > 0 ? (
                          dispositivoStats.capacitadosNoCoordinaron.map((r, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white border border-orange-100 shadow-sm">
                              <span className={`text-sm font-medium text-slate-700 ${getAgentFormat(Number(r.rId || 0))}`}>
                                {r.residente}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs flex items-center gap-1 text-slate-500">
                                  <Calendar className="w-3 h-3" /> {formatDate(r.fechaCap)}
                                </span>
                                <Badge variant="outline" className="text-xs text-orange-600 bg-orange-50 border-orange-200">0 {turnoMode === 'apertura' ? 'FDS' : turnoMode === 'tm' ? 'T/M' : 'Total'}</Badge>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center p-8 border border-dashed rounded-lg border-orange-200 text-orange-600/70 text-sm">
                            Todos los residentes capacitados han pasado por aquí.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </CardContent>
            ) : (
              <CardContent className="p-12 text-center text-muted-foreground bg-slate-50 border-t">
                Selecciona un dispositivo en el menú superior para ver su información.
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* TARJETA GLOBAL ACOMPAÑA GRUPO */}
      <Card className="shadow-md border-t-4 border-t-pink-500">
        <CardHeader className="bg-muted/30 pb-4 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              🏫 Ranking Acompaña Grupo
            </CardTitle>
            <CardDescription>
              Residentes que acompañaron grupo, ordenados por cantidad de veces.
            </CardDescription>
          </div>
          <Badge className="bg-pink-100 text-pink-800 hover:bg-pink-200 text-sm px-3 py-1">
            {acompanaList.length} registros
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {(() => {
            const ranking = residentes
              .map(r => {
                const a = acompanaMap.get(r.id_agente);
                return {
                  residente: r.nombre_completo,
                  count: a?.count || 0,
                  lastDate: a?.dates?.length ? [...a.dates].sort().pop()! : null,
                };
              })
              .filter(r => r.count > 0)
              .sort((a, b) => b.count - a.count);

            if (ranking.length === 0) {
              return (
                <div className="p-12 text-center text-muted-foreground">
                  No hay registros de "acompaña grupo" en 2026.
                </div>
              );
            }

            return (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Residente</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-right">Última Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.map((item, idx) => (
                      <TableRow key={idx} className={idx === 0 ? "bg-pink-50/50" : ""}>
                        <TableCell className="text-center font-medium text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-semibold">{item.residente}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-pink-100 text-pink-800 hover:bg-pink-200 min-w-[32px] justify-center text-sm px-3">
                            {item.count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {item.lastDate ? formatDate(item.lastDate) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            );
          })()}
        </CardContent>
      </Card>

      {/* MODAL RANKING DIVERSIDAD */}
      <Dialog open={showDiversidadModal} onOpenChange={setShowDiversidadModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-green-700 flex items-center gap-2">
              <MapIcon className="w-5 h-5" /> Ranking de Diversidad Grupal
            </DialogTitle>
            <DialogDescription>
              Ordenado de mayor a menor según el porcentaje de dispositivos únicos coordinados.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Residente</TableHead>
                    <TableHead className="text-center">Dispositivos Únicos</TableHead>
                    <TableHead className="text-right">Diversidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {globalMetrics?.rankingDiversidad.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-center font-medium text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-semibold">{item.residente}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="bg-slate-50">{item.unicos}</Badge></TableCell>
                      <TableCell className="text-right text-green-600 font-bold">{item.diversidad.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
