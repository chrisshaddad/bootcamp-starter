'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useDarkMode } from '@/hooks/use-dark-mode';

type DarkModeContextType = ReturnType<typeof useDarkMode>;

const DarkModeContext = createContext<DarkModeContextType | null>(null);

/** Provider that exposes dark mode state and toggle to all children */
export function DarkModeProvider({ children }: { children: ReactNode }) {
  const darkMode = useDarkMode();
  return (
    <DarkModeContext.Provider value={darkMode}>
      {children}
    </DarkModeContext.Provider>
  );
}

/** Access dark mode state from any component within the provider */
export function useDarkModeContext() {
  const ctx = useContext(DarkModeContext);
  if (!ctx)
    throw new Error('useDarkModeContext must be used within DarkModeProvider');
  return ctx;
}
