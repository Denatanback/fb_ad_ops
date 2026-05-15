"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { STORAGE_THEME_KEY, type Theme } from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(nextTheme: Theme) {
  document.documentElement.dataset.theme = nextTheme;
  document.cookie = `theme=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;
  window.localStorage.setItem(STORAGE_THEME_KEY, nextTheme);
}

export function ThemeProvider({
  children,
  defaultTheme
}: Readonly<{
  children: React.ReactNode;
  defaultTheme: Theme;
}>) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const resolvedTheme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setThemeState(resolvedTheme);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme(nextTheme) {
        setThemeState(nextTheme);
        applyTheme(nextTheme);
      },
      toggleTheme() {
        const nextTheme = theme === "dark" ? "light" : "dark";
        setThemeState(nextTheme);
        applyTheme(nextTheme);
      }
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
}
