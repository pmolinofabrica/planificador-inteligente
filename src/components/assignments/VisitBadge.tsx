import React from 'react';
import type { VisitaInfo } from '@/types/assignments';

interface VisitBadgeProps {
  visitas: VisitaInfo[];
  compact?: boolean;
  locked?: boolean;
}

const estadoStyle: Record<string, string> = {
  confirmada: 'bg-[hsl(var(--score-high-bg))] text-[hsl(var(--score-high-text))] border-[hsl(var(--score-high-border))]',
  asignada: 'bg-[hsl(var(--floor-2-bg))] text-[hsl(var(--floor-2-text))] border-[hsl(var(--floor-2-border))]',
  pendiente: 'bg-[hsl(var(--score-mid-bg))] text-[hsl(var(--score-mid-text))] border-[hsl(var(--score-mid-border))]',
};

const estadoLabel: Record<string, string> = {
  confirmada: '✅ Confirmada',
  asignada: '📋 Asignada',
  pendiente: '⏳ Pendiente',
};

/** Compact inline pill for table headers */
export const VisitChip: React.FC<{ visitas: VisitaInfo[] }> = ({ visitas }) => {
  if (visitas.length === 0) return null;
  const totalPersonas = visitas.reduce((s, v) => s + v.cantidad_personas, 0);
  const allConfirmed = visitas.every(v => v.estado === 'confirmada');
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${
      allConfirmed
        ? 'bg-[hsl(var(--score-high-bg))] text-[hsl(var(--score-high-text))] border-[hsl(var(--score-high-border))]'
        : 'bg-[hsl(var(--score-mid-bg))] text-[hsl(var(--score-mid-text))] border-[hsl(var(--score-mid-border))]'
    }`}>
      🏫 {visitas.length} · 👥 {totalPersonas}
    </span>
  );
};

/** Full block for MenuView / detail views */
export const VisitBlock: React.FC<VisitBadgeProps> = ({ visitas, compact = false, locked = false }) => {
  if (visitas.length === 0) return null;

  if (compact) {
    return (
      <div className="space-y-1">
        {visitas.map(v => (
          <div key={v.id_asignacion} className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] sm:text-xs ${estadoStyle[v.estado] || estadoStyle.pendiente}`}>
            <span className="font-bold truncate">{v.nombre_institucion || 'Sin nombre'}</span>
            <span className="text-[9px] flex-shrink-0">👥{v.cantidad_personas}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-[hsl(var(--floor-2-border))] bg-[hsl(var(--floor-2-bg))] overflow-hidden">
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-[hsl(var(--floor-2-border))]/50 flex items-center gap-2">
        <span className="text-sm sm:text-base">🏫</span>
        <span className="font-black text-xs sm:text-sm tracking-wide text-[hsl(var(--floor-2-text))]">
          Visitas Grupales ({visitas.length})
        </span>
      </div>
      <div className="p-2 sm:p-3 space-y-1.5">
        {visitas.map(v => (
          <div key={v.id_asignacion} className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border ${estadoStyle[v.estado] || estadoStyle.pendiente}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[11px] sm:text-xs truncate">
                {v.nombre_institucion || 'Sin nombre'}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded border bg-card/50">
                {estadoLabel[v.estado] || v.estado}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[10px] sm:text-[11px] font-medium opacity-80">
              <span>👥 {v.cantidad_personas} personas</span>
              {v.rango_etario && <span>📅 {v.rango_etario}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
