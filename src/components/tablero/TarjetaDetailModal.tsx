import { Inbox, PlayCircle, MessageCircle, CheckCircle2, Archive } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TIPO_CONFIG, ESTADO_COLUMNS } from '@/types/tablero';
import type { TableroItem, TableroUser, TableroEstado, TableroComentario } from '@/types/tablero';
import { CommentThread } from './CommentThread';

const ICON_MAP = { Inbox, PlayCircle, MessageCircle, CheckCircle2, Archive };

interface TarjetaDetailModalProps {
  item: TableroItem | null;
  open: boolean;
  onClose: () => void;
  currentUser: TableroUser | null;
  comentarios: TableroComentario[];
  onUpdateEstado: (id: number, estado: TableroEstado) => Promise<void>;
  onAddComment: (itemId: number, contenido: string) => Promise<void>;
}

const isDev = (user: TableroUser | null) => user === 'Pablo';

export function TarjetaDetailModal({
  item, open, onClose, currentUser, comentarios, onUpdateEstado, onAddComment,
}: TarjetaDetailModalProps) {
  if (!item) return null;

  const tipoCfg = TIPO_CONFIG[item.tipo];
  const fecha = new Date(item.created_at).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tipoCfg.badge}`}>
              {tipoCfg.icon} {tipoCfg.label}
            </span>
            <span className="text-xs text-muted-foreground">por {item.autor_nombre} · {fecha}</span>
          </div>
          <DialogTitle>{item.titulo}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {item.descripcion && (
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{item.descripcion}</p>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Estado</label>
            <div className="grid grid-cols-5 gap-1.5">
              {ESTADO_COLUMNS.map((col) => {
                const isActive = item.estado === col.estado;
                const canMove = isDev(currentUser) && !isActive;
                const Icon = ICON_MAP[col.icon as keyof typeof ICON_MAP];
                return (
                  <button
                    key={col.estado}
                    onClick={() => canMove && onUpdateEstado(item.id, col.estado)}
                    disabled={!canMove}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[10px] font-bold transition-all border ${
                      isActive
                        ? 'bg-primary/10 border-primary text-foreground'
                        : canMove
                          ? `${col.color} border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground cursor-pointer`
                          : `${col.color} border-border text-muted-foreground/40 cursor-default`
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                    <span className="leading-tight text-center">{col.shortLabel}</span>
                  </button>
                );
              })}
            </div>
            {!isDev(currentUser) && (
              <p className="text-[10px] text-muted-foreground/60 mt-1.5 text-center">
                Solo Pablo puede cambiar el estado
              </p>
            )}
          </div>

          <hr className="border-border" />

          <CommentThread
            comentarios={comentarios}
            currentUser={currentUser}
            onAddComment={async (contenido) => {
              await onAddComment(item.id, contenido);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
