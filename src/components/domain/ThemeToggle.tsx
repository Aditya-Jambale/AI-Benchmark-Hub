"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "modelindex-theme";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const nextTheme: Theme = stored === "light" ? "light" : "dark";
      setTheme(nextTheme);
      applyTheme(nextTheme);
      setMounted(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const nextTheme: Theme = current === "dark" ? "light" : "dark";
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
      applyTheme(nextTheme);
      return nextTheme;
    });
  }

  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      aria-pressed={mounted ? !isDark : false}
    >
      {isDark ? <Moon /> : <Sun />}
    </Button>
  );
}
