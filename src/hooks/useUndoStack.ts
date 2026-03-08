import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { UndoEntry, UndoSnapshot } from '@/types/assignments';

const UNDO_STORAGE_KEY = 'gestion_centro_undo_stack';
const UNDO_MAX_ENTRIES = 50;

export function useUndoStack(refresh: () => void) {
  const [undoStack, setUndoStack] = useState<UndoEntry[]>(() => {
    try {
      const raw = localStorage.getItem(UNDO_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as UndoEntry[];
      const todayStr = new Date().toISOString().split('T')[0];
      return parsed.filter(e => e._timestamp?.startsWith(todayStr));
    } catch {
      return [];
    }
  });

  const saveStack = useCallback((stack: UndoEntry[]) => {
    const capped = stack.length > UNDO_MAX_ENTRIES ? stack.slice(-UNDO_MAX_ENTRIES) : stack;
    try { localStorage.setItem(UNDO_STORAGE_KEY, JSON.stringify(capped)); } catch {}
    return capped;
  }, []);

  const pushUndo = useCallback((entry: Omit<UndoEntry, '_timestamp'>) => {
    setUndoStack(prev => {
      const next = [...prev, { ...entry, _timestamp: new Date().toISOString() }];
      return saveStack(next);
    });
  }, [saveStack]);

  const handleUndo = useCallback(async (setLoading: (v: boolean) => void) => {
    if (undoStack.length === 0) return;
    setLoading(true);
    const lastAction = undoStack[undoStack.length - 1];

    try {
      const snaps: UndoSnapshot[] = lastAction.snapshots
        ? lastAction.snapshots
        : lastAction.snapshot
          ? [lastAction.snapshot]
          : [];

      if (snaps.length === 0) {
        alert('No hay snapshot válido para deshacer.');
        setLoading(false);
        return;
      }

      const results = await Promise.all(
        snaps.map(snap => {
          if (snap._isInsert) {
            return supabase.from('menu')
              .delete()
              .eq('id_agente', snap.id_agente)
              .eq('fecha_asignacion', snap.fecha_asignacion);
          } else {
            return supabase.from('menu')
              .update({
                id_dispositivo: snap.id_dispositivo,
                estado_ejecucion: snap.estado_ejecucion,
              })
              .eq('id_agente', snap.id_agente)
              .eq('fecha_asignacion', snap.fecha_asignacion);
          }
        })
      );

      const anyError = results.find(r => r.error);
      if (anyError?.error) {
        alert('Error al deshacer: ' + anyError.error.message);
      } else {
        setUndoStack(prev => {
          const next = prev.slice(0, -1);
          saveStack(next);
          return next;
        });
        refresh();
      }
    } catch (e: any) {
      alert('Excepción al deshacer: ' + e.message);
    }
    setLoading(false);
  }, [undoStack, saveStack, refresh]);

  return { undoStack, pushUndo, handleUndo };
}
