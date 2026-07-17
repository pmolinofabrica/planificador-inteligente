import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TableroItem, TableroComentario, TableroEstado, TableroUser, TableroTipo, TableroApp } from '@/types/tablero';

export function useTablero(app: TableroApp = 'asignaciones') {
  const [items, setItems] = useState<TableroItem[]>([]);
  const [comentarios, setComentarios] = useState<TableroComentario[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    const { data } = await supabase
      .from('tablero_items')
      .select('*')
      .eq('app', app)
      .order('updated_at', { ascending: false });
    if (data) setItems(data as TableroItem[]);
  }, [app]);

  const loadComentarios = useCallback(async () => {
    const { data } = await supabase
      .from('tablero_comentarios')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setComentarios(data as TableroComentario[]);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadItems(), loadComentarios()]);
      setLoading(false);
    })();
  }, [loadItems, loadComentarios]);

  const crearItem = async (titulo: string, descripcion: string, tipo: TableroTipo, autor: TableroUser) => {
    const { error } = await supabase.from('tablero_items').insert({
      titulo, descripcion, tipo, estado: 'pendiente', autor_nombre: autor, app,
    });
    if (!error) await loadItems();
    return { error: error?.message || null };
  };

  const updateEstado = async (id: number, estado: TableroEstado) => {
    const { error } = await supabase
      .from('tablero_items')
      .update({ estado, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) await loadItems();
    return { error: error?.message || null };
  };

  const agregarComentario = async (itemId: number, autor: TableroUser, contenido: string) => {
    const { error } = await supabase.from('tablero_comentarios').insert({
      item_id: itemId, autor_nombre: autor, contenido,
    });
    if (!error) {
      await Promise.all([loadComentarios(), loadItems()]);
    }
    return { error: error?.message || null };
  };

  const getComentariosByItem = (itemId: number) =>
    comentarios.filter(c => c.item_id === itemId);

  return {
    items,
    comentarios,
    loading,
    crearItem,
    updateEstado,
    agregarComentario,
    getComentariosByItem,
    refresh: loadItems,
  };
}
