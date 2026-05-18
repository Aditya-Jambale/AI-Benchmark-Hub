"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Trophy, ExternalLink, X } from "lucide-react";
import { useCompare } from "@/hooks/useCompare";

export interface CompareModel {
  id: string;
  slug: string;
  name: string;
  parameters: number | null;
  contextWindow: number;
  architecture: string | null;
  license: string | null;
  provider: { name: string; slug: string };
  pricing: { inputCost: number; outputCost: number } | null;
  scores: { benchmarkId: string; benchmarkName: string; metricType: string; score: number }[];
}

interface CompareMatrixProps {
  models: CompareModel[];
}

function formatContext(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function formatCost(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n === 0) return "Free";
  if (n < 0.01) return `<$0.01`;
  return `$${n.toFixed(2)}`;
}

function formatScore(score: number, metricType: string): string {
  if (metricType === "elo") return Math.round(score).toLocaleString();

  const value = score <= 1 ? score * 100 : score;
  return `${value.toFixed(1)}`;
}

/** Returns indices of the best value(s). Lower is better for cost, higher for everything else. */
function findWinners(
  values: (number | null)[],
  direction: "higher" | "lower" = "higher"
): Set<number> {
  const valid = values
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v != null) as { v: number; i: number }[];

  if (valid.length === 0) return new Set();

  const best =
    direction === "higher"
      ? Math.max(...valid.map((x) => x.v))
      : Math.min(...valid.map((x) => x.v));

  // Only highlight if there's a clear winner (not a tie among all)
  const winners = valid.filter((x) => x.v === best);
  if (winners.length === valid.length) return new Set(); // All tied

  return new Set(winners.map((x) => x.i));
}

function WinnerBadge() {
  return (
    <Trophy className="ml-1 inline size-3 text-green-500" />
  );
}

interface RowProps {
  label: string;
  values: (string | null | undefined)[];
  winners?: Set<number>;
  className?: string;
}

function CompareRow({ label, values, winners, className }: RowProps) {
  return (
    <tr className={cn("border-b border-border", className)}>
      <td className="py-2.5 pr-4 text-xs text-muted-foreground font-medium whitespace-nowrap sticky left-0 bg-card z-10">
        {label}
      </td>
      {values.map((val, i) => (
        <td
          key={i}
          className={cn(
            "py-2.5 px-4 text-sm tabular-nums text-card-foreground",
            winners?.has(i) && "text-green-500 font-semibold"
          )}
        >
          {val ?? "—"}
          {winners?.has(i) && <WinnerBadge />}
        </td>
      ))}
    </tr>
  );
}

export function CompareMatrix({ models }: CompareMatrixProps) {
  const { remove } = useCompare();

  // Map benchmarkId to name (from first model that has it)
  const benchmarkNames = new Map<string, { name: string; metricType: string }>();
  for (const m of models) {
    for (const s of m.scores) {
      if (!benchmarkNames.has(s.benchmarkId)) {
        benchmarkNames.set(s.benchmarkId, {
          name: s.benchmarkName,
          metricType: s.metricType,
        });
      }
    }
  }

  // Sort benchmarks by name
  const sortedBenchmarks = [...benchmarkNames.entries()].sort((a, b) =>
    a[1].name.localeCompare(b[1].name)
  );

  // Precompute winners
  const paramWinners = findWinners(models.map((m) => m.parameters));
  const ctxWinners = findWinners(models.map((m) => m.contextWindow));
  const inputCostWinners = findWinners(
    models.map((m) => m.pricing?.inputCost ?? null),
    "lower"
  );
  const outputCostWinners = findWinners(
    models.map((m) => m.pricing?.outputCost ?? null),
    "lower"
  );

  const benchmarkWinners = new Map<string, Set<number>>();
  for (const [benchId] of sortedBenchmarks) {
    const scores = models.map((m) => {
      const s = m.scores.find((s) => s.benchmarkId === benchId);
      return s?.score ?? null;
    });
    // ELO and percentage: higher is better
    benchmarkWinners.set(benchId, findWinners(scores, "higher"));
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] border-collapse">
        <thead>
          <tr className="border-b-2 border-border">
            <th className="py-3 pr-4 text-left text-xs text-muted-foreground font-medium uppercase tracking-wide sticky left-0 bg-card z-10 w-[140px]">
              Attribute
            </th>
            {models.map((m) => (
              <th key={m.id} className="py-3 px-4 text-left min-w-[180px]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/models/${m.slug}`}
                      className="text-sm font-semibold text-foreground hover:underline"
                    >
                      {m.name}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.provider.name}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(m.slug)}
                    className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={`Remove ${m.name}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Specifications section */}
          <tr className="border-b border-border">
            <td
              colSpan={models.length + 1}
              className="py-2 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 sticky left-0 z-10"
            >
              Specifications
            </td>
          </tr>
          <CompareRow
            label="Parameters"
            values={models.map((m) =>
              m.parameters != null ? `${m.parameters}B` : "Proprietary"
            )}
            winners={paramWinners}
          />
          <CompareRow
            label="Context"
            values={models.map((m) => formatContext(m.contextWindow))}
            winners={ctxWinners}
          />
          <CompareRow
            label="Architecture"
            values={models.map((m) => m.architecture)}
          />
          <CompareRow
            label="License"
            values={models.map((m) => m.license)}
          />

          {/* Pricing section */}
          <tr className="border-b border-border">
            <td
              colSpan={models.length + 1}
              className="py-2 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 sticky left-0 z-10"
            >
              Pricing (per 1M tokens)
            </td>
          </tr>
          <CompareRow
            label="Input"
            values={models.map((m) => formatCost(m.pricing?.inputCost))}
            winners={inputCostWinners}
          />
          <CompareRow
            label="Output"
            values={models.map((m) => formatCost(m.pricing?.outputCost))}
            winners={outputCostWinners}
          />

          {/* Benchmarks section */}
          {sortedBenchmarks.length > 0 && (
            <tr className="border-b border-border">
              <td
                colSpan={models.length + 1}
                className="py-2 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 sticky left-0 z-10"
              >
                Benchmarks
              </td>
            </tr>
          )}
          {sortedBenchmarks.map(([benchId, { name, metricType }]) => (
            <CompareRow
              key={benchId}
              label={name}
              values={models.map((m) => {
                const s = m.scores.find((s) => s.benchmarkId === benchId);
                return s ? formatScore(s.score, metricType) : null;
              })}
              winners={benchmarkWinners.get(benchId)}
            />
          ))}

          {/* Provider links row */}
          <tr className="border-t-2 border-border">
            <td className="py-3 pr-4 text-xs text-muted-foreground font-medium sticky left-0 bg-card z-10">
              Links
            </td>
            {models.map((m) => (
              <td key={m.id} className="py-3 px-4">
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://huggingface.co/models?search=${encodeURIComponent(m.slug)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    HuggingFace
                    <ExternalLink className="size-2.5" />
                  </a>
                  <a
                    href={`https://openrouter.ai/${m.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    OpenRouter
                    <ExternalLink className="size-2.5" />
                  </a>
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
