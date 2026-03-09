import React, { useState } from 'react';
import type { VisitaInfo } from '@/types/assignments';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getGroupColor } from '@/lib/floor-utils';

interface VisitBadgeProps {
  visitas: VisitaInfo[];
  compact?: boolean;
  locked?: boolean;
  onGroupChange?: (id_asignacion: number, grupo: number | null) => void;
  interactive?: boolean;
}

const estadoStyle: Record<string, string> = {
  confirmada: 'bg-[hsl(var(--score-high-bg))] text-[hsl(var(--score-high-text))] border-[hsl(var(--score-high-border))]',
  confirmado: 'bg-[hsl(var(--score-high-bg))] text-[hsl(var(--score-high-text))] border-[hsl(var(--score-high-border))]',
  asignada: 'bg-[hsl(var(--floor-2-bg))] text-[hsl(var(--floor-2-text))] border-[hsl(var(--floor-2-border))]',
  asignado: 'bg-[hsl(var(--floor-2-bg))] text-[hsl(var(--floor-2-text))] border-[hsl(var(--floor-2-border))]',
  pendiente: 'bg-[hsl(var(--score-mid-bg))] text-[hsl(var(--score-mid-text))] border-[hsl(var(--score-mid-border))]',
  en_espera: 'bg-[hsl(var(--score-mid-bg))] text-[hsl(var(--score-mid-text))] border-[hsl(var(--score-mid-border))]',
};

const estadoLabel: Record<string, string> = {
  confirmada: '✅ Confirmada',
  confirmado: '✅ Confirmado',
  asignada: '📋 Asignada',
  asignado: '📋 Asignado',
  pendiente: '⏳ Pendiente',
  en_espera: '⏳ En espera',
};

/** Compact inline pill for table headers — shows ages breakdown */
export const VisitChip: React.FC<{ visitas: VisitaInfo[] }> = ({ visitas }) => {
  if (visitas.length === 0) return null;
  const totalPersonas = visitas.reduce((s, v) => s + v.cantidad_personas, 0);
  const allConfirmed = visitas.every(v => v.estado === 'confirmada' || v.estado === 'confirmado');
  // Collect unique age ranges
  const ages = visitas.map(v => v.rango_etario).filter(Boolean);
  const uniqueAges = [...new Set(ages)];

  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${
      allConfirmed
        ? 'bg-[hsl(var(--score-high-bg))] text-[hsl(var(--score-high-text))] border-[hsl(var(--score-high-border))]'
        : 'bg-[hsl(var(--score-mid-bg))] text-[hsl(var(--score-mid-text))] border-[hsl(var(--score-mid-border))]'
    }`}>
      🏫 {visitas.length} · 👥 {totalPersonas}
      {uniqueAges.length > 0 && <span className="opacity-80">· {uniqueAges.join(', ')}</span>}
    </span>
  );
};

/** Detailed chip for DevicesTab metrics — per-visit age breakdown */
export const VisitDetailChip: React.FC<{ visitas: VisitaInfo[] }> = ({ visitas }) => {
  if (visitas.length === 0) return null;
  return (
    <div className="mt-1 space-y-0.5">
      {visitas.map(v => (
        <div key={v.id_asignacion} className="text-[9px] font-bold flex items-center gap-1 flex-wrap">
          <span className="text-foreground">🏫 {v.nombre_institucion || 'Sin nombre'}</span>
          <span className="text-muted-foreground">👥{v.cantidad_personas}</span>
          {v.rango_etario && <span className="text-primary/80">📅 {v.rango_etario}</span>}
          {v.numero_grupo != null && (
            <span className={`px-1 py-0.5 rounded text-[8px] font-mono border ${getGroupColor(v.numero_grupo)}`}>G{v.numero_grupo}</span>
          )}
        </div>
      ))}
    </div>
  );
};

/** Full block for MenuView / detail views — with optional group assignment */
export const VisitBlock: React.FC<VisitBadgeProps> = ({ visitas, compact = false, locked = false, onGroupChange, interactive = false }) => {
  const [editingId, setEditingId] = useState<number | null>(null);

  if (visitas.length === 0) return null;

  const handleGroupSelect = async (id_asignacion: number, grupo: number | null) => {
    setEditingId(null);
    try {
      const { error } = await supabase
        .from('asignaciones_visita')
        .update({ numero_grupo: grupo })
        .eq('id_asignacion', id_asignacion);
      if (error) throw error;
      onGroupChange?.(id_asignacion, grupo);
      toast.success(`Grupo ${grupo ? `G${grupo}` : 'removido'} asignado`);
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  if (compact) {
    return (
      <div className="space-y-1">
        {visitas.map(v => (
          <div key={v.id_asignacion} className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] sm:text-xs ${estadoStyle[v.estado] || estadoStyle.pendiente}`}>
            <span className="font-bold truncate">{v.nombre_institucion || 'Sin nombre'}</span>
            <span className="text-[9px] flex-shrink-0">👥{v.cantidad_personas}</span>
            {v.rango_etario && <span className="text-[9px] flex-shrink-0 opacity-70">📅{v.rango_etario}</span>}
            {v.numero_grupo != null && (
              <span className={`text-[8px] px-1 py-0.5 rounded font-mono border ${getGroupColor(v.numero_grupo)}`}>G{v.numero_grupo}</span>
            )}
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
        {visitas.map(v => {
          const isEditing = editingId === v.id_asignacion;
          return (
            <div key={v.id_asignacion} className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border ${estadoStyle[v.estado] || estadoStyle.pendiente}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[11px] sm:text-xs truncate">
                  {v.nombre_institucion || 'Sin nombre'}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Group badge / editor */}
                  {isEditing ? (
                    <div className="flex gap-0.5">
                      {[null, 1, 2, 3].map(g => (
                        <button key={g ?? 'x'} onClick={() => handleGroupSelect(v.id_asignacion, g)}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono border transition-all hover:scale-110 ${
                            g === v.numero_grupo ? 'ring-2 ring-primary font-bold' : ''
                          } ${g != null ? getGroupColor(g) : 'bg-muted text-muted-foreground border-border'}`}>
                          {g != null ? `G${g}` : '✕'}
                        </button>
                      ))}
                    </div>
                  ) : v.numero_grupo != null ? (
                    <button
                      onClick={interactive && !locked ? () => setEditingId(v.id_asignacion) : undefined}
                      className={`text-[9px] px-1 py-0.5 rounded font-mono border ${getGroupColor(v.numero_grupo)} ${
                        interactive && !locked ? 'cursor-pointer hover:ring-2 hover:ring-primary/40 hover:scale-110 transition-all' : ''
                      }`}>
                      G{v.numero_grupo}
                    </button>
                  ) : interactive && !locked ? (
                    <button
                      onClick={() => setEditingId(v.id_asignacion)}
                      className="text-[9px] px-1 py-0.5 rounded font-mono border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-all">
                      +G
                    </button>
                  ) : null}
                  <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border bg-card/50">
                    {estadoLabel[v.estado] || v.estado}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[10px] sm:text-[11px] font-medium opacity-80">
                <span>👥 {v.cantidad_personas} personas</span>
                {v.rango_etario && <span>📅 {v.rango_etario}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
