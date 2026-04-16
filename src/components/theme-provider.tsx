'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

/**
 * next-themes + `class` sur `<html>` — `suppressHydrationWarning` est sur la balise html du layout racine.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      storageKey="nezha-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
