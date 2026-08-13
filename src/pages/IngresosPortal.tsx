import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, LogIn, CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';

interface ResidenteIngreso {
  id_agente: number;
  nombre: string;
  apellido: string;
  nombre_completo: string;
}

type EstadoMarcado =
  | { tipo: 'ok'; nombre: string; hora: string }
  | { tipo: 'ya_ingresado'; nombre: string; hora: string }
  | { tipo: 'codigo_invalido' }
  | { tipo: 'residente_invalido' }
  | { tipo: 'error'; mensaje: string };

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

// En desarrollo se omite Turnstile y se llama al RPC directo.
const IS_DEV = import.meta.env.DEV;
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

const mensajeError = (code: string) => {
  switch (code) {
    case 'verificacion_invalida':
      return 'La verificación anti-bots falló. Intentá de nuevo.';
    case 'verificacion_requerida':
      return 'Completá la verificación anti-bots para continuar.';
    case 'server_no_configurado':
      return 'El servidor no está configurado. Avisá al coordinador.';
    case 'supabase_error':
      return 'Hubo un error al registrar. Intentá de nuevo.';
    case 'body_invalido':
      return 'Solicitud inválida. Reintentá.';
    default:
      return 'Hubo un error. Intentá de nuevo.';
  }
};

const IngresosPortal: React.FC = () => {
  const [residentes, setResidentes] = useState<ResidenteIngreso[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ResidenteIngreso | null>(null);
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLista, setLoadingLista] = useState(true);
  const [resultado, setResultado] = useState<EstadoMarcado | null>(null);
  const [yaMarcado, setYaMarcado] = useState<{ hora: string } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');

  const fecha = todayDB();

  useEffect(() => {
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any).from('vista_residentes_ingreso').select('*');
        setResidentes((data as ResidenteIngreso[]) || []);
      } catch (e) {
        console.error('Error cargando residentes', e);
      } finally {
        setLoadingLista(false);
      }
    })();
  }, []);

  // Cargar el script de Turnstile una sola vez
  useEffect(() => {
    if (IS_DEV) return;
    const scriptId = 'cf-turnstile-script';
    if (document.getElementById(scriptId)) return;
    const s = document.createElement('script');
    s.id = scriptId;
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    document.head.appendChild(s);
  }, []);

  // Renderizar el widget cuando hay un residente seleccionado
  useEffect(() => {
    setTurnstileToken('');
    if (IS_DEV || !selected) return;
    let cancelled = false;
    const render = () => {
      if (cancelled) return;
      const node = document.getElementById('turnstile-widget');
      if (!node || node.children.length > 0) return;
      if (!window.turnstile) {
        setTimeout(render, 200);
        return;
      }
      window.turnstile.render(node, {
        sitekey: SITE_KEY,
        callback: (token: string) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(''),
      });
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  // Pre-consulta: si el residente ya marcó hoy, avisarle apenas se selecciona
  useEffect(() => {
    if (!selected) {
      setYaMarcado(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any).rpc('rpc_consulta_ingreso', {
          p_fecha: fecha,
          p_id_agente: selected.id_agente,
        });
        if (cancelled) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = (data as any)?.[0];
        setYaMarcado(row?.hora_ingreso ? { hora: fmtHora(row.hora_ingreso) } : null);
      } catch (e) {
        console.error('Error consultando ingreso', e);
        if (!cancelled) setYaMarcado(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, fecha]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return residentes;
    return residentes.filter(r => r.nombre_completo.toLowerCase().includes(s));
  }, [residentes, search]);

  const marcar = async () => {
    if (!selected || codigo.trim().length === 0) return;
    if (!IS_DEV && !turnstileToken) {
      setResultado({ tipo: 'error', mensaje: mensajeError('verificacion_requerida') });
      return;
    }
    setLoading(true);
    setResultado(null);
    try {
      let data;
      if (IS_DEV) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await (supabase as any).rpc('rpc_marcar_ingreso', {
          p_fecha: fecha,
          p_id_agente: selected.id_agente,
          p_codigo: codigo.trim(),
        });
        data = res.data;
      } else {
        const resp = await fetch('/api/marcar-ingreso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fecha,
            id_agente: selected.id_agente,
            codigo: codigo.trim(),
            turnstile_token: turnstileToken,
          }),
        });
        data = await resp.json();
        if (data?.error) {
          setResultado({ tipo: 'error', mensaje: mensajeError(data.error) });
          setLoading(false);
          return;
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = (data as any)?.[0];
      if (!row) {
        setResultado({ tipo: 'error', mensaje: 'No se pudo procesar el ingreso. Intentá de nuevo.' });
      } else if (row.estado === 'ok') {
        setResultado({ tipo: 'ok', nombre: row.nombre, hora: fmtHora(row.hora) });
      } else if (row.estado === 'ya_ingresado') {
        setResultado({ tipo: 'ya_ingresado', nombre: row.nombre, hora: fmtHora(row.hora) });
      } else if (row.estado === 'codigo_invalido') {
        setResultado({ tipo: 'codigo_invalido' });
      } else {
        setResultado({ tipo: 'residente_invalido' });
      }
    } catch (e) {
      console.error(e);
      setResultado({ tipo: 'error', mensaje: 'Error de conexión. Revisá la red e intentá de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  const reiniciar = () => {
    setSelected(null);
    setSearch('');
    setCodigo('');
    setResultado(null);
    setYaMarcado(null);
    setTurnstileToken('');
  };

  return (
    <main className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-warm-lg overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-primary text-primary-foreground flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <LogIn className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight leading-tight">Registro de Ingreso</h1>
            <p className="text-[11px] text-primary-foreground/80 font-medium">Marcá tu presencia al entrar al espacio</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Fecha */}
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Hoy: {fecha.split('-').reverse().join('/')}</span>
          </div>

          {/* Resultado */}
          {resultado && (
            <div className={`rounded-xl border p-3 text-sm font-semibold flex items-start gap-2.5 ${
              resultado.tipo === 'ok'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : resultado.tipo === 'ya_ingresado'
                  ? 'border-sky-300 bg-sky-50 text-sky-800'
                  : 'border-red-300 bg-red-50 text-red-700'
            }`}>
              {resultado.tipo === 'ok' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : resultado.tipo === 'ya_ingresado' ? (
                <Clock className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <div>
                {resultado.tipo === 'ok' && <>Ingreso registrado. ¡Bienvenido/a, {String(resultado.nombre).trim().split(/\s+/).pop()}! ({resultado.hora})</>}
                {resultado.tipo === 'ya_ingresado' && <>Ya marcaste tu ingreso hoy a las {resultado.hora}. No hace falta repetirlo.</>}
                {resultado.tipo === 'codigo_invalido' && <>El código del día no es válido. Verificá que sea el indicado por el coordinador.</>}
                {resultado.tipo === 'residente_invalido' && <>No encontramos ese residente. Consultá con el coordinador.</>}
                {resultado.tipo === 'error' && <>{resultado.mensaje}</>}
              </div>
            </div>
          )}

          {/* Selección de residente */}
          {!selected ? (
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Buscá tu nombre
              </label>
              <div className="relative">
                <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Escribí tu nombre o apellido..."
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                  autoFocus
                />
              </div>
              <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-border bg-background divide-y divide-border/60">
                {loadingLista && (
                  <div className="p-3 text-xs text-muted-foreground text-center">Cargando residentes...</div>
                )}
                {!loadingLista && filtered.length === 0 && (
                  <div className="p-3 text-xs text-muted-foreground text-center">Sin resultados</div>
                )}
                {filtered.map(r => (
                  <button
                    key={r.id_agente}
                    onClick={() => setSelected(r)}
                    className="w-full text-left px-3 py-2.5 text-sm font-semibold hover:bg-accent transition-colors"
                  >
                    {r.nombre_completo}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Residente</div>
                <div className="text-base font-black">{selected.nombre_completo}</div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Cambiar"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Aviso si ya marcó hoy */}
          {selected && yaMarcado && (
            <div className="rounded-xl border border-sky-300 bg-sky-50 text-sky-800 p-3 text-sm font-semibold flex items-start gap-2.5">
              <Clock className="w-5 h-5 shrink-0" />
              <div>Ya marcaste tu ingreso hoy a las {yaMarcado.hora}. No hace falta repetirlo.</div>
            </div>
          )}

          {/* Código del día */}
          {selected && (
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Código del día
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full text-center text-2xl font-black tracking-[0.5em] py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                onKeyDown={(e) => { if (e.key === 'Enter') marcar(); }}
              />
            </div>
          )}

          {/* Verificación anti-bots (solo producción) */}
          {selected && !IS_DEV && (
            <div className="flex items-center justify-center rounded-xl border border-border bg-background py-2.5">
              <div
                id="turnstile-widget"
                key={selected.id_agente}
                className="flex items-center justify-center"
              />
            </div>
          )}

          {/* Acciones */}
          {selected && (
            <button
              onClick={marcar}
              disabled={loading || codigo.trim().length < 4 || (!IS_DEV && !turnstileToken)}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-black flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none"
            >
              {loading ? 'Registrando...' : 'Marcar mi ingreso'}
            </button>
          )}

          {resultado && (
            <button
              onClick={reiniciar}
              className="w-full py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
            >
              Registrar otro ingreso
            </button>
          )}
        </div>
      </div>
    </main>
  );
};

export default IngresosPortal;
