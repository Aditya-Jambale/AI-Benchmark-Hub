"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { searchModels, type ModelSearchResult } from "@/app/actions/search";

function formatContext(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(value);
}

function formatCost(value: number | null | undefined): string {
  if (value == null) return "-";
  if (value === 0) return "Free";
  if (value < 0.01) return "<$0.01";
  return `$${value.toFixed(2)}`;
}

function formatScore(score: ModelSearchResult["topScore"]): string {
  if (!score) return "No scores";
  if (score.metricType === "elo") {
    return `${Math.round(score.score).toLocaleString()} Elo`;
  }

  const value = score.score <= 1 ? score.score * 100 : score.score;
  return `${value.toFixed(1)} ${score.benchmarkName}`;
}

export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ModelSearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    let active = true;
    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        const nextResults = await searchModels(trimmed);
        if (active) setResults(nextResults);
      });
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [query]);

  const canSearch = query.trim().length >= 2;
  const visibleResults = canSearch ? results : [];

  function navigateTo(slug: string) {
    setOpen(false);
    setQuery("");
    router.push(`/models/${slug}`);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="hidden h-8 w-[260px] justify-between px-3 text-muted-foreground md:flex"
        onClick={() => setOpen(true)}
      >
        <span className="inline-flex items-center gap-2">
          <Search data-icon="inline-start" />
          Search models
        </span>
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          Cmd K
        </kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Search models"
      >
        <Search />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search models"
        description="Search the ModelIndex directory by model or provider."
        className="sm:max-w-2xl"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Type a model name or provider..."
          />
          <CommandList>
            {isPending && (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="animate-spin" />
                Searching directory
              </div>
            )}
            {!isPending && canSearch && visibleResults.length === 0 && (
              <CommandEmpty>No matching models found.</CommandEmpty>
            )}
            {visibleResults.length > 0 && (
              <CommandGroup heading="Models">
                {visibleResults.map((result) => (
                  <CommandItem
                    key={result.slug}
                    value={result.slug}
                    onSelect={() => navigateTo(result.slug)}
                    className="items-start"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {result.name}
                        </span>
                        <Badge variant="secondary">{result.provider.name}</Badge>
                      </div>
                      <span className="truncate text-xs text-muted-foreground">
                        {result.slug}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatContext(result.contextWindow)} context /{" "}
                        {formatCost(result.pricing?.inputCost)} /{" "}
                        {formatCost(result.pricing?.outputCost)} per 1M /{" "}
                        {formatScore(result.topScore)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
