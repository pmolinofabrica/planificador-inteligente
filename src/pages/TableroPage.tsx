import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, ArrowLeft } from 'lucide-react';
import { useTablero } from '@/hooks/useTablero';
import { UserSelector } from '@/components/tablero/UserSelector';
import { TableroBoard } from '@/components/tablero/TableroBoard';
import { NuevaTarjetaDialog } from '@/components/tablero/NuevaTarjetaDialog';
import { STORAGE_USER_KEY } from '@/types/tablero';
import type { TableroUser, TableroTipo } from '@/types/tablero';

export default function TableroPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<TableroUser | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [filterTipo, setFilterTipo] = useState<TableroTipo | 'todas'>('todas');

  const {
    items, comentarios, loading, crearItem, updateEstado, agregarComentario, getComentariosByItem, refresh,
  } = useTablero('asignaciones');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_USER_KEY) as TableroUser | null;
    if (saved && (['Pablo', 'Vane', 'Celi', 'Euge', 'Eli'] as const).includes(saved as any)) {
      setCurrentUser(saved);
    }
  }, []);

  const filteredItems = filterTipo === 'todas'
    ? items
    : items.filter(i => i.tipo === filterTipo);

  const handleCrearTarjeta = async (titulo: string, descripcion: string, tipo: TableroTipo, autor: TableroUser) => {
    const { error } = await crearItem(titulo, descripcion, tipo, autor);
    if (error) alert(`Error al crear: ${error}`);
  };

  const isDev = currentUser === 'Pablo';

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <header className="bg-card border-b border-border px-3 sm:px-6 py-3 flex flex-col gap-2 sticky top-0 z-20 shadow-warm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
              title="Volver a Asignaciones"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="bg-primary p-1.5 sm:p-2 rounded-lg text-primary-foreground shadow-warm">
              <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight">
              Tablero
            </h1>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full hidden sm:inline">
              {items.length} tarjetas
            </span>
          </div>
          <div className="flex items-center gap-2">
            <UserSelector currentUser={currentUser} onSelect={setCurrentUser} />
            <button
              onClick={() => setShowNewDialog(true)}
              disabled={!currentUser}
              className="p-1.5 sm:p-2 rounded-lg border transition-all bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 disabled:opacity-40 disabled:pointer-events-none"
              title="Nueva tarjeta"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterTipo('todas')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border ${
              filterTipo === 'todas'
                ? 'bg-card border-foreground/20 text-foreground shadow-sm'
                : 'bg-muted border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            Todas
          </button>
          {(['fallo', 'mensaje', 'propuesta'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterTipo(t)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border ${
                filterTipo === t
                  ? 'bg-card border-foreground/20 text-foreground shadow-sm'
                  : 'bg-muted border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'fallo' ? '🐛 Fallos' : t === 'mensaje' ? '💬 Mensajes' : '💡 Propuestas'}
            </button>
          ))}
          {isDev && (
            <button
              onClick={refresh}
              className="ml-auto px-2.5 py-1 rounded-md text-[10px] font-bold border border-border bg-muted text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
            >
              🔄 Refrescar
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 p-4 sm:p-6 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <TableroBoard
            items={filteredItems}
            comentarios={comentarios}
            currentUser={currentUser}
            onUpdateEstado={updateEstado}
            onAddComment={async (itemId, contenido) => {
              if (!currentUser) return;
              await agregarComentario(itemId, currentUser, contenido);
            }}
            getComentariosByItem={getComentariosByItem}
          />
        )}
      </div>

      {!currentUser && !loading && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-warm-lg pointer-events-auto max-w-sm text-center">
            <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-sm font-bold text-foreground mb-1">Seleccioná tu usuario</h3>
            <p className="text-xs text-muted-foreground">
              Elegí quién sos en el selector de arriba para empezar a usar el tablero.
            </p>
          </div>
        </div>
      )}

      <NuevaTarjetaDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        currentUser={currentUser}
        onSubmit={handleCrearTarjeta}
      />
    </div>
  );
}
