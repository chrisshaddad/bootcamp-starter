'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Light/dark mode provider (next-themes). Distinct from ThemeProvider in
 * theme-provider.tsx, which applies the per-gym brand color, not light/dark.
 * Class-based (`attribute="class"`) because lib/theme/apply-theme.ts injects
 * a literal `.dark { ... }` override block that depends on `.dark` being the
 * toggle mechanism — switching to `data-theme` would break it.
 */
export function ModeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
