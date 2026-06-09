import { useState, useCallback } from 'react';

const CAP_KEY = 'settings_show_capacitados_colors';
const PISO_KEY = 'settings_show_piso_colors';

export function useSettings() {
  const [showCapacitadosColors, setShowCapacitadosColorsState] = useState(() => {
    try {
      const stored = localStorage.getItem(CAP_KEY);
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  const [showPisoColors, setShowPisoColorsState] = useState(() => {
    try {
      const stored = localStorage.getItem(PISO_KEY);
      return stored !== null ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  const setShowCapacitadosColors = useCallback((value: boolean) => {
    setShowCapacitadosColorsState(value);
    try { localStorage.setItem(CAP_KEY, JSON.stringify(value)); } catch {}
  }, []);

  const setShowPisoColors = useCallback((value: boolean) => {
    setShowPisoColorsState(value);
    try { localStorage.setItem(PISO_KEY, JSON.stringify(value)); } catch {}
  }, []);

  return { showCapacitadosColors, setShowCapacitadosColors, showPisoColors, setShowPisoColors };
}
