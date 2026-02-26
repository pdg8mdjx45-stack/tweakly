/**
 * Theme Context
 * Persists the user's theme preference to AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'tweakly-theme-mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useRNColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [hydrated, setHydrated] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val === 'light' || val === 'dark' || val === 'system') {
          setThemeModeState(val);
        }
      })
      .catch(console.error)
      .finally(() => setHydrated(true));
  }, []);

  const resolvedTheme: 'light' | 'dark' =
    themeMode === 'system' ? (systemScheme ?? 'light') : themeMode;

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(console.error);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(resolvedTheme === 'light' ? 'dark' : 'light');
  }, [resolvedTheme, setThemeMode]);

  // Provide context even during hydration to avoid "useThemeContext must be used within ThemeProvider" error
  // Use default light theme during hydration
  const initialTheme: 'light' | 'dark' = 'light';

  return (
    <ThemeContext.Provider value={hydrated 
      ? { themeMode, resolvedTheme, setThemeMode, toggleTheme }
      : { themeMode: 'light', resolvedTheme: initialTheme, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within a ThemeProvider');
  return ctx;
}
