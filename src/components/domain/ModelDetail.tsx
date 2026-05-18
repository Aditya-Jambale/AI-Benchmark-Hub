"use client";

import { Badge } from "@/components/ui/badge";
import { BenchmarkRadar } from "@/components/domain/BenchmarkRadar";
import { CostScatter } from "@/components/domain/CostScatter";
import type { ModelDetailData, RadarDatum, CostScatterPoint } from "@/types";
import {
  Calendar,
  Cpu,
  Layers,
  DollarSign,
  ExternalLink,
  BarChart3,
  ScatterChartIcon,
} from "lucide-react";

interface ModelDetailProps {
  model: ModelDetailData;
  radarData: RadarDatum[];
  scatterData: CostScatterPoint[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
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
  return value.toFixed(1);
}

export function ModelDetail({ model, radarData, scatterData }: ModelDetailProps) {
  const headlineDate = model.releaseDate ?? model.createdAt;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight font-heading">
            {model.name}
          </h1>
          <Badge variant="secondary">{model.provider.name}</Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {model.releaseDate ? "Released" : "Added"} {formatDate(headlineDate)}
          </span>
          {model.parameters != null && (
            <span className="inline-flex items-center gap-1.5">
              <Cpu className="size-3.5" />
              {model.parameters}B parameters
            </span>
          )}
        </div>
        {model.summary && (
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {model.summary}
          </p>
        )}
      </header>

      {/* Specification Grid + Cost Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Specification Grid */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            <Layers className="size-4" />
            Specifications
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Architecture</dt>
              <dd className="font-medium text-card-foreground">
                {model.architecture ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Parameters</dt>
              <dd className="font-medium text-card-foreground">
                {model.parameters != null ? `${model.parameters}B` : "Proprietary"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Context Window</dt>
              <dd className="font-medium text-card-foreground">
                {formatContext(model.contextWindow)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">License</dt>
              <dd className="font-medium text-card-foreground">
                {model.license ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Provider</dt>
              <dd className="font-medium text-card-foreground">
                {model.provider.name}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Release Date</dt>
              <dd className="font-medium text-card-foreground">
                {model.releaseDate ? formatMonthYear(model.releaseDate) : "Unknown"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Added</dt>
              <dd className="font-medium text-card-foreground">
                {formatDate(model.createdAt)}
              </dd>
            </div>
          </dl>
        </section>

        {/* Cost Summary */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            <DollarSign className="size-4" />
            Pricing
          </h2>
          {model.pricing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md bg-muted/50 p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Input
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-card-foreground">
                    {formatCost(model.pricing.inputCost)}
                  </p>
                  <p className="text-xs text-muted-foreground">per 1M tokens</p>
                </div>
                <div className="rounded-md bg-muted/50 p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Output
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-card-foreground">
                    {formatCost(model.pricing.outputCost)}
                  </p>
                  <p className="text-xs text-muted-foreground">per 1M tokens</p>
                </div>
              </div>
              {model.pricing.inputCost === 0 && model.pricing.outputCost === 0 && (
                <p className="text-center text-sm text-green-500 font-medium">
                  Free to use
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No pricing data available
            </p>
          )}
        </section>
      </div>

      {/* Benchmark Scores Table */}
      {model.scores.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            <BarChart3 className="size-4" />
            Benchmark Scores
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {model.scores
              .sort((a, b) => b.score - a.score)
              .map((s) => (
                <div
                  key={s.benchmarkId}
                  className="rounded-md bg-muted/50 p-3"
                >
                  <p className="text-xs text-muted-foreground truncate">
                    {s.benchmark.name}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-card-foreground">
                    {formatScore(s.score, s.benchmark.metricType)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.benchmark.metricType}
                  </p>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Visualizations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Radar Chart */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            <BarChart3 className="size-4" />
            Performance Radar
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            {model.name} vs. category average
          </p>
          {(() => {
            const percentageScores = model.scores.filter(
              (s) => s.benchmark.metricType !== "elo",
            );
            const eloScores = model.scores.filter(
              (s) => s.benchmark.metricType === "elo",
            );

            if (percentageScores.length >= 3) {
              return <BenchmarkRadar data={radarData} modelName={model.name} />;
            }

            if (eloScores.length > 0) {
              return (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Insufficient percentage benchmarks for radar visualization
                  </p>
                  <div className="flex gap-3">
                    {eloScores.map((s) => (
                      <div key={s.benchmarkId} className="rounded-md bg-muted/50 p-4 text-center">
                        <p className="text-xs text-muted-foreground">{s.benchmark.name}</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-card-foreground">
                          {formatScore(s.score, s.benchmark.metricType)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <p className="text-sm text-muted-foreground">
                No benchmark scores available
              </p>
            );
          })()}
        </section>

        {/* Cost Scatter */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            <ScatterChartIcon className="size-4" />
            Cost Efficiency
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Performance vs. price across all tracked models
          </p>
          <CostScatter data={scatterData} />
        </section>
      </div>

      {/* Provider Links */}
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          <ExternalLink className="size-4" />
          Links
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={`https://huggingface.co/models?search=${encodeURIComponent(model.slug)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            HuggingFace
            <ExternalLink className="size-3" />
          </a>
          <a
            href={`https://openrouter.ai/${model.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            OpenRouter
            <ExternalLink className="size-3" />
          </a>
        </div>
      </section>
    </div>
  );
}
