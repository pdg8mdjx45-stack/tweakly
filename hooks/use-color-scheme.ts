import { useThemeContext } from './use-theme-context';

/**
 * Custom useColorScheme hook that uses our theme context.
 * Falls back to 'light' as the default.
 */
export function useColorScheme() {
  const { resolvedTheme } = useThemeContext();
  return resolvedTheme;
}

export { useThemeContext } from './use-theme-context';
