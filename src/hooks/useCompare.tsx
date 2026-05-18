"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

const MAX_COMPARE = 4;
const STORAGE_KEY = "modelindex-compare-v1";

interface CompareContextValue {
  /** Slugs of selected models. */
  selected: string[];
  /** Add a model slug. No-op if at capacity or already selected. */
  add: (slug: string) => void;
  /** Remove a model slug. */
  remove: (slug: string) => void;
  /** Toggle a model slug. */
  toggle: (slug: string) => void;
  /** Check if a slug is selected. */
  isSelected: (slug: string) => boolean;
  /** Clear all selections. */
  clear: () => void;
  /** Whether the tray has reached max capacity. */
  isFull: boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setHydrated(true);
          return;
        }

        const parsed = JSON.parse(raw) as { selected?: unknown };
        if (!Array.isArray(parsed.selected)) {
          setHydrated(true);
          return;
        }

        const restored = parsed.selected
          .filter((slug): slug is string => typeof slug === "string")
          .slice(0, MAX_COMPARE);
        setSelected([...new Set(restored)]);
        setHydrated(true);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        setHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ selected }));
  }, [hydrated, selected]);

  const add = useCallback((slug: string) => {
    setSelected((prev) => {
      if (prev.includes(slug) || prev.length >= MAX_COMPARE) return prev;
      return [...prev, slug];
    });
  }, []);

  const remove = useCallback((slug: string) => {
    setSelected((prev) => prev.filter((s) => s !== slug));
  }, []);

  const toggle = useCallback((slug: string) => {
    setSelected((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, slug];
    });
  }, []);

  const isSelected = useCallback(
    (slug: string) => selected.includes(slug),
    [selected]
  );

  const clear = useCallback(() => setSelected([]), []);

  return (
    <CompareContext.Provider
      value={{
        selected,
        add,
        remove,
        toggle,
        isSelected,
        clear,
        isFull: selected.length >= MAX_COMPARE,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
