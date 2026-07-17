import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TIPO_CONFIG, TABLERO_USERS } from '@/types/tablero';
import type { TableroUser, TableroTipo } from '@/types/tablero';

interface NuevaTarjetaDialogProps {
  open: boolean;
  onClose: () => void;
  currentUser: TableroUser | null;
  onSubmit: (titulo: string, descripcion: string, tipo: TableroTipo, autor: TableroUser) => Promise<void>;
  dialogTitle?: string;
}

export function NuevaTarjetaDialog({ open, onClose, currentUser, onSubmit, dialogTitle = 'Nueva tarjeta' }: NuevaTarjetaDialogProps) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<TableroTipo>('fallo');
  const [autor, setAutor] = useState<TableroUser>(currentUser || TABLERO_USERS[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!titulo.trim() || saving) return;
    setSaving(true);
    await onSubmit(titulo.trim(), descripcion.trim(), tipo, autor);
    setSaving(false);
    setTitulo('');
    setDescripcion('');
    setTipo('fallo');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tipo</label>
            <div className="flex gap-1.5">
              {(Object.entries(TIPO_CONFIG) as [TableroTipo, typeof TIPO_CONFIG[TableroTipo]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setTipo(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    tipo === key
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>
          {!currentUser && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Autor</label>
              <select
                value={autor}
                onChange={(e) => setAutor(e.target.value as TableroUser)}
                className="w-full bg-muted border border-border rounded-md px-2 py-1.5 text-sm text-foreground outline-none"
              >
                {TABLERO_USERS.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Título</label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Resumí en una línea..."
              className="w-full bg-muted border border-border rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary/50"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Descripción (opcional)</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Contá más detalles..."
              rows={3}
              className="w-full bg-muted border border-border rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary/50 resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!titulo.trim() || saving}
            className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Creando...' : 'Crear tarjeta'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
