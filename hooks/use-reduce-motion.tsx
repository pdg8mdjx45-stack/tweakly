import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

interface ReduceMotionContextType {
  reduceMotion: boolean;
  setReduceMotion: (value: boolean) => void;
  animationsEnabled: boolean;
}

const ReduceMotionContext = createContext<ReduceMotionContextType | undefined>(undefined);

const STORAGE_KEY = 'tweakly-reduce-motion';

export function ReduceMotionProvider({ children }: { children: ReactNode }) {
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val !== null) {
          setReduceMotionState(val === 'true');
        }
      })
      .catch(console.error)
      .finally(() => setHydrated(true));
  }, []);

  const setReduceMotion = useCallback((value: boolean) => {
    setReduceMotionState(value);
    AsyncStorage.setItem(STORAGE_KEY, String(value)).catch(console.error);
  }, []);

  const animationsEnabled = !reduceMotion;

  return (
    <ReduceMotionContext.Provider value={{ reduceMotion, setReduceMotion, animationsEnabled }}>
      {children}
    </ReduceMotionContext.Provider>
  );
}

export function useReduceMotion(): ReduceMotionContextType {
  const ctx = useContext(ReduceMotionContext);
  if (!ctx) throw new Error('useReduceMotion must be used within ReduceMotionProvider');
  return ctx;
}
