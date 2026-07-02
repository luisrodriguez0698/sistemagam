"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Envolver en app/layout.tsx: <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
