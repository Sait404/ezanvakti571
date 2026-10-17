import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { settingsStore } from '../features/settings/store';
import { useStore } from '../utils/persistedStore';
import { dark, light, type Palette } from './tokens';

type Theme = { colors: Palette; isDark: boolean; fontScale: number };

const ThemeContext = createContext<Theme>({ colors: light, isDark: false, fontScale: 1 });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const mode = useStore(settingsStore, (s) => s.themeMode);
  const fontScale = useStore(settingsStore, (s) => s.fontScale);
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const value = useMemo(() => ({ colors: isDark ? dark : light, isDark, fontScale }), [isDark, fontScale]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
