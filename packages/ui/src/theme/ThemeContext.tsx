import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeConfig } from './types';
import { THEME_PRESETS, DEFAULT_THEME } from './presets';
import { applyTheme, getStoredTheme, saveStoredTheme } from './engine';

interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  setPreset: (presetId: string) => void;
  resetTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeConfig>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeConfig) => {
    setThemeState(newTheme);
    saveStoredTheme(newTheme);
  };

  const setPreset = (presetId: string) => {
    const found = THEME_PRESETS[presetId];
    if (found) {
      setTheme(found);
    }
  };

  const resetTheme = () => {
    setTheme(DEFAULT_THEME);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        setPreset,
        resetTheme,
        isDark: theme.mode === 'dark' || theme.mode === 'oled',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: DEFAULT_THEME,
      setTheme: () => {},
      setPreset: () => {},
      resetTheme: () => {},
      isDark: false,
    };
  }
  return ctx;
}

