import React from 'react';
import { X, MessageSquare, Phone, PhoneOff } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { LlamadoInfo } from '@/types/assignments';

interface ObservacionesPopupProps {
  idAsignacion: number;
  nombre: string;
  observacionesReferente: string | null;
  llamados: LlamadoInfo[];
  onClose: () => void;
}

export const ObservacionesPopup: React.FC<ObservacionesPopupProps> = ({
  idAsignacion, nombre, observacionesReferente, llamados, onClose,
}) => {
  const llamadosConObs = llamados.filter(l => l.observaciones && l.observaciones.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-card rounded-xl border shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="min-w-0">
            <h3 className="font-bold text-sm truncate">{nombre}</h3>
            <p className="text-xs text-muted-foreground">#{idAsignacion} — Observaciones</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5 overflow-y-auto max-h-[calc(80vh-60px)]">
          {/* Referente section */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Referente
            </h4>
            {observacionesReferente ? (
              <div className="px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm">
                {observacionesReferente}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Sin observaciones del referente</p>
            )}
          </div>

          {/* Pedagógico section */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Pedagógico
            </h4>
            {llamadosConObs.length > 0 ? (
              <div className="space-y-1.5">
                {llamadosConObs.map(l => (
                  <div
                    key={l.id_llamado}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-xs space-y-1',
                      l.atendio
                        ? 'border-[hsl(var(--score-high-border))] bg-[hsl(var(--score-high-bg))]/30'
                        : 'border-destructive/20 bg-destructive/5'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {l.atendio ? (
                          <Phone className="w-3 h-3 text-[hsl(var(--score-high-text))]" />
                        ) : (
                          <PhoneOff className="w-3 h-3 text-destructive" />
                        )}
                        <span className="font-medium">{l.agente || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'font-semibold px-1.5 py-0.5 rounded text-[10px]',
                          l.atendio
                            ? 'text-[hsl(var(--score-high-text))] bg-[hsl(var(--score-high-bg))]'
                            : 'text-destructive bg-destructive/10'
                        )}>
                          {l.atendio ? 'Atendió' : 'No atendió'}
                        </span>
                        <span className="text-muted-foreground">
                          {l.fecha_hora ? format(new Date(l.fecha_hora), 'dd/MM HH:mm') : '—'}
                        </span>
                      </div>
                    </div>
                    <p className="text-foreground italic pl-4">"{l.observaciones}"</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Sin observaciones pedagógicas</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
