import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette, type Palette } from './colors';
import { useAppServices } from '@/services/AppServices';
import type { ThemeMode } from '@/storage/SettingsStorage';

/**
 * ThemeContext.tsx
 *
 * Backs the Appearance section in Settings. "System" reads the OS color
 * scheme via useColorScheme() and reacts live if it changes; "Light"/"Dark"
 * override it explicitly. The choice is persisted through SettingsStorage
 * (AsyncStorage), so it survives app restarts.
 */

interface ThemeContextValue {
  colors: Palette;
  mode: ThemeMode;
  effectiveScheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settingsStorage } = useAppServices();
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    settingsStorage.load().then((s) => setModeState(s.themeMode));
  }, [settingsStorage]);

  function setMode(next: ThemeMode) {
    setModeState(next);
    settingsStorage.update({ themeMode: next });
  }

  const effectiveScheme: 'light' | 'dark' =
    mode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: effectiveScheme === 'light' ? lightPalette : darkPalette,
      mode,
      effectiveScheme,
      setMode,
    }),
    [effectiveScheme, mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() must be used inside <ThemeProvider>');
  return ctx;
}