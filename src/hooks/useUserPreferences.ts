import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type Preferences = {
  showCapacitadosColors: boolean;
  showPisoColors: boolean;
  allowMultiDispositivoApertura: boolean;
  motorAsignacionEnabled: boolean;
  showRefuerzos: boolean;
};

const DEFAULTS: Preferences = {
  showCapacitadosColors: true,
  showPisoColors: false,
  allowMultiDispositivoApertura: false,
  motorAsignacionEnabled: false,
  showRefuerzos: false,
};

const LS_KEYS: Record<keyof Preferences, string> = {
  showCapacitadosColors: 'settings_show_capacitados_colors',
  showPisoColors: 'settings_show_piso_colors',
  allowMultiDispositivoApertura: 'settings_allow_multi_dispositivo_apertura',
  motorAsignacionEnabled: 'settings_motor_asignacion_enabled',
  showRefuerzos: 'settings_show_refuerzos',
};

function loadLocal(): Preferences {
  const prefs = { ...DEFAULTS };
  for (const [key, lsKey] of Object.entries(LS_KEYS)) {
    try {
      const stored = localStorage.getItem(lsKey);
      if (stored !== null) {
        (prefs as any)[key] = JSON.parse(stored);
      }
    } catch {}
  }
  return prefs;
}

function saveLocal(prefs: Preferences) {
  for (const [key, lsKey] of Object.entries(LS_KEYS)) {
    try {
      localStorage.setItem(lsKey, JSON.stringify((prefs as any)[key]));
    } catch {}
  }
}

export function useUserPreferences() {
  const { user, isLoading: authLoading } = useAuth();
  const [preferences, setPreferences] = useState<Preferences>(loadLocal);

  // Load from DB once user is available
  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error && data?.preferences) {
        const dbPrefs = data.preferences as Partial<Preferences>;
        const merged = { ...DEFAULTS, ...dbPrefs, ...loadLocal() };
        setPreferences(merged);
        saveLocal(merged);
      }
    })();
  }, [user, authLoading]);

  const updatePreference = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences(prev => {
      const next = { ...prev, [key]: value };
      saveLocal(next);
      return next;
    });
  }, []);

  // Sync to DB
  const saveToDb = useCallback(async () => {
    if (!user) return;
    const prefs = loadLocal();
    const { data: existing } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    const { error } = existing
      ? await supabase.from('user_preferences').update({ preferences: prefs }).eq('user_id', user.id)
      : await supabase.from('user_preferences').insert({ user_id: user.id, preferences: prefs });
    if (error) console.error('Error saving preferences:', error);
  }, [user]);

  // Auto-sync to DB when preferences change (debounced)
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => { saveToDb(); }, 2000);
    return () => clearTimeout(timer);
  }, [preferences, user, saveToDb]);

  const setters = {
    setShowCapacitadosColors: useCallback((v: boolean) => updatePreference('showCapacitadosColors', v), [updatePreference]),
    setShowPisoColors: useCallback((v: boolean) => updatePreference('showPisoColors', v), [updatePreference]),
    setAllowMultiDispositivoApertura: useCallback((v: boolean) => updatePreference('allowMultiDispositivoApertura', v), [updatePreference]),
    setMotorAsignacionEnabled: useCallback((v: boolean) => updatePreference('motorAsignacionEnabled', v), [updatePreference]),
    setShowRefuerzos: useCallback((v: boolean) => updatePreference('showRefuerzos', v), [updatePreference]),
  };

  return {
    ...preferences,
    ...setters,
  };
}
