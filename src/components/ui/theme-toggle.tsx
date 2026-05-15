"use client";

import { useTheme } from "@/components/providers/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button className="theme-toggle" onClick={toggleTheme} type="button">
      <span>{isDark ? "Тёмная" : "Светлая"}</span>
      <span className="mono">{isDark ? "-> светлая" : "-> тёмная"}</span>
    </button>
  );
}
