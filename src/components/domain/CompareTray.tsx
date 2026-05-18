"use client";

import Link from "next/link";
import { useCompare } from "@/hooks/useCompare";
import { X, ArrowRight, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

export function CompareTray() {
  const { selected, remove, clear, isFull } = useCompare();

  if (selected.length === 0) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-md shadow-lg">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3 overflow-x-auto">
          <LayoutGrid className="size-4 shrink-0 text-muted-foreground" />
          <span className="shrink-0 text-xs text-muted-foreground uppercase tracking-wide">
            Compare
          </span>
          <div className="flex items-center gap-2">
            {selected.map((slug) => (
              <span
                key={slug}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground"
              >
                <span className="max-w-[120px] truncate">{slug}</span>
                <button
                  onClick={() => remove(slug)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={`Remove ${slug}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
          {isFull && (
            <span className="text-xs text-muted-foreground">(max 4)</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={clear}
            className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
          <Link
            href={`/compare?models=${selected.join(",")}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-semibold transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            Compare {selected.length}
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
