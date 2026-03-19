import { createContext, useCallback, useContext, useRef } from 'react';
import type { View } from 'react-native';

export interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TourContextValue {
  registerRef: (key: string, ref: View | null) => void;
  measureRef: (key: string) => Promise<SpotlightRect | null>;
}

const TourContext = createContext<TourContextValue>({
  registerRef: () => {},
  measureRef: async () => null,
});

export function TourProvider({ children }: { children: React.ReactNode }) {
  const refs = useRef<Record<string, View | null>>({});

  const registerRef = useCallback((key: string, ref: View | null) => {
    refs.current[key] = ref;
  }, []);

  const measureRef = useCallback((key: string): Promise<SpotlightRect | null> => {
    return new Promise((resolve) => {
      const ref = refs.current[key];
      if (!ref) { resolve(null); return; }
      ref.measureInWindow((x, y, width, height) => {
        if (width === 0 && height === 0) { resolve(null); return; }
        resolve({ x, y, width, height });
      });
    });
  }, []);

  return (
    <TourContext.Provider value={{ registerRef, measureRef }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  return useContext(TourContext);
}
