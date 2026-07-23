import { lightTheme, type Theme } from './themes';

/**
 * Video Club is light-only. `ThemeProvider` is kept as a thin pass-through so
 * the root layout needs no structural change, and `useTheme()` stays the single
 * accessor every component already uses — it just always resolves to the light
 * theme now.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useTheme(): Theme {
  return lightTheme;
}
