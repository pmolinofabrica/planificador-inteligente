import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Users, KeyRound, RefreshCw, CheckCircle2, Clock, X, CalendarDays, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ResidenteIngreso {
  id_agente: number;
  nombre: string;
  apellido: string;
  nombre_completo: string;
}

interface IngresoRow {
  id_agente: number;
  hora_ingreso: string;
}

const todayDB = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

const fmtHora = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const fmtFecha = (db: string) => db.split('-').reverse().join('/');

const IngresosPanel: React.FC = () => {
  const { signOut } = useAuth();
  const [fecha, setFecha] = useState(todayDB());
  const [residentes, setResidentes] = useState<ResidenteIngreso[]>([]);
  const [ingresos, setIngresos] = useState<IngresoRow[]>([]);
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadResidentes = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from('vista_residentes_ingreso').select('*');
      setResidentes((data as ResidenteIngreso[]) || []);
    } catch (e) {
      console.error('Error cargando residentes', e);
    }
  };

  const loadDia = useMemo(() => async () => {
    const [codigoRes, ingresosRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('codigos_dia').select('codigo').eq('fecha', fecha).maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('ingresos_residentes').select('id_agente, hora_ingreso').eq('fecha', fecha),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setCodigo((codigoRes as any)?.data?.codigo || '');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setIngresos(((ingresosRes as any)?.data as IngresoRow[]) || []);
  }, [fecha]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadResidentes(), loadDia()]);
      setLoading(false);
    })();
  }, [loadDia]);

  useEffect(() => {
    const id = setInterval(loadDia, 30000);
    return () => clearInterval(id);
  }, [loadDia]);

  const generarCodigo = async () => {
    const nuevo = String(Math.floor(1000 + Math.random() * 9000));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('codigos_dia')
      .upsert({ fecha, codigo: nuevo }, { onConflict: 'fecha' });
    if (error) {
      console.error('Error generando código', error);
      return;
    }
    setCodigo(nuevo);
  };

  const eliminarIngreso = async (idAgente: number, nombre: string) => {
    if (!confirm(`¿Quitar el ingreso de ${nombre}?`)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('ingresos_residentes')
      .delete()
      .eq('fecha', fecha)
      .eq('id_agente', idAgente);
    if (error) {
      console.error('Error eliminando ingreso', error);
      return;
    }
    await loadDia();
  };

  const presentesSet = useMemo(() => new Set(ingresos.map(i => i.id_agente)), [ingresos]);
  const horaDe = (id: number) => ingresos.find(i => i.id_agente === id)?.hora_ingreso;

  const presentesLista = residentes.filter(r => presentesSet.has(r.id_agente));
  const pendientesLista = residentes.filter(r => !presentesSet.has(r.id_agente));

  const filtradas = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return residentes;
    return residentes.filter(r => r.nombre_completo.toLowerCase().includes(s));
  }, [residentes, search]);

  return (
    <main className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 py-3 sticky top-0 z-20 shadow-warm flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight leading-tight">Ingresos del día</h1>
            <p className="text-[11px] text-muted-foreground font-medium">Actualización automática cada 30 segundos</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted px-3 py-2 rounded-xl border border-border">
            <CalendarDays className="w-4 h-4" />
            <input
              type="date"
              value={fecha}
              onChange={(e) => e.target.value && setFecha(e.target.value)}
              className="bg-transparent focus:outline-none"
            />
          </label>
          <button
            onClick={loadDia}
            disabled={loading}
            className="p-2 rounded-xl border border-border bg-muted text-muted-foreground hover:bg-accent transition-colors"
            title="Actualizar ahora"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={signOut}
            className="p-2 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Código del día */}
        <section className="rounded-2xl border border-border bg-card shadow-warm-lg p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Código del día</div>
              <div className="text-2xl font-black tracking-[0.4em] text-primary">
                {codigo || '----'}
              </div>
            </div>
          </div>
          <button
            onClick={generarCodigo}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:opacity-90 transition-opacity flex items-center gap-2 justify-center"
          >
            <KeyRound className="w-3.5 h-3.5" />
            {codigo ? 'Regenerar código' : 'Generar código'}
          </button>
        </section>

        {/* Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-warm">
            <div className="text-2xl font-black text-primary">{presentesLista.length}</div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Presentes</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-warm">
            <div className="text-2xl font-black text-muted-foreground">{pendientesLista.length}</div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sin ingresar</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-warm col-span-2 sm:col-span-1">
            <div className="text-2xl font-black">{residentes.length}</div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total convocados</div>
          </div>
        </div>

        {/* Grilla de residentes */}
        <section className="rounded-2xl border border-border bg-card shadow-warm-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-foreground">Estado del día ({fmtFecha(fecha)})</span>
            <div className="flex items-center gap-2 sm:ml-auto">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar residente..."
                  className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{presentesLista.length}/{residentes.length}</span>
            </div>
          </div>
          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[50vh] overflow-y-auto">
            {residentes.length === 0 && (
              <div className="col-span-full text-center text-xs text-muted-foreground py-6">Sin residentes activos en la cohorte.</div>
            )}
            {residentes.length > 0 && filtradas.length === 0 && (
              <div className="col-span-full text-center text-xs text-muted-foreground py-6">Sin resultados para la búsqueda.</div>
            )}
            {filtradas.map(r => {
              const presente = presentesSet.has(r.id_agente);
              const hora = presente ? horaDe(r.id_agente) : undefined;
              return (
                <div key={r.id_agente} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  presente
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-muted/20 border-border'
                }`}>
                  {presente ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  )}
                  <span className={`text-sm font-semibold truncate flex-1 ${presente ? 'text-emerald-900' : 'text-muted-foreground'}`}>
                    {r.nombre_completo}
                  </span>
                  {presente ? (
                    <>
                      <span className="text-[11px] font-mono font-bold text-emerald-700 shrink-0">{hora}</span>
                      <button
                        onClick={() => eliminarIngreso(r.id_agente, r.nombre_completo)}
                        className="p-1 rounded-md text-emerald-500 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                        title="Quitar ingreso"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider shrink-0">—</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
};

export default IngresosPanel;
