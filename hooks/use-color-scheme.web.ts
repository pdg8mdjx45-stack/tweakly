import { useEffect, useState } from 'react';
import { useThemeContext } from './use-theme-context';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Use the theme context for web as well
  const { resolvedTheme } = useThemeContext();

  if (hasHydrated) {
    return resolvedTheme;
  }

  return 'light';
}

export { useThemeContext } from './use-theme-context';
