import { useState, useCallback } from 'react';

const CAP_KEY = 'settings_show_capacitados_colors';
const PISO_KEY = 'settings_show_piso_colors';
const MULTI_AP_KEY = 'settings_allow_multi_dispositivo_apertura';
const MOTOR_KEY = 'settings_motor_asignacion_enabled';

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

  const [allowMultiDispositivoApertura, setAllowMultiDispositivoAperturaState] = useState(() => {
    try {
      const stored = localStorage.getItem(MULTI_AP_KEY);
      return stored !== null ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  const [motorAsignacionEnabled, setMotorAsignacionEnabledState] = useState(() => {
    try {
      const stored = localStorage.getItem(MOTOR_KEY);
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

  const setAllowMultiDispositivoApertura = useCallback((value: boolean) => {
    setAllowMultiDispositivoAperturaState(value);
    try { localStorage.setItem(MULTI_AP_KEY, JSON.stringify(value)); } catch {}
  }, []);

  const setMotorAsignacionEnabled = useCallback((value: boolean) => {
    setMotorAsignacionEnabledState(value);
    try { localStorage.setItem(MOTOR_KEY, JSON.stringify(value)); } catch {}
  }, []);

  return {
    showCapacitadosColors, setShowCapacitadosColors,
    showPisoColors, setShowPisoColors,
    allowMultiDispositivoApertura, setAllowMultiDispositivoApertura,
    motorAsignacionEnabled, setMotorAsignacionEnabled,
  };
}
