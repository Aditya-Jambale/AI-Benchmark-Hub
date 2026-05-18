"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompare } from "@/hooks/useCompare";

/** Serializable model row passed from the server component. */
export interface ModelRow {
  id: string;
  slug: string;
  name: string;
  parameters: number | null;
  contextWindow: number;
  provider: {
    name: string;
    slug: string;
  };
  pricing: {
    inputCost: number;
    outputCost: number;
  } | null;
  scores: {
    benchmarkSlug: string;
    benchmarkName: string;
    metricType: string;
    score: number;
  }[];
}

const BENCHMARK_TRIO = [
  { slug: "mmlu", label: "MMLU" },
  { slug: "gpqa", label: "GPQA" },
  { slug: "math", label: "MATH" },
] as const;

type BenchmarkSlug = (typeof BENCHMARK_TRIO)[number]["slug"];
type SortField =
  | "name"
  | "provider"
  | "parameters"
  | "contextWindow"
  | "inputCost"
  | "outputCost"
  | BenchmarkSlug;
type SortDir = "asc" | "desc";

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

function formatScore(
  score: number | null | undefined,
  metricType?: string
): string {
  if (score == null) return "-";
  if (metricType === "elo") return Math.round(score).toLocaleString();

  const value = score <= 1 ? score * 100 : score;
  return value.toFixed(1);
}

function getBenchmarkScore(model: ModelRow, slug: string) {
  return model.scores.find((score) => score.benchmarkSlug === slug) ?? null;
}

function compareNullableNumber(
  a: number | null | undefined,
  b: number | null | undefined,
  direction: SortDir
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  const cmp = a - b;
  return direction === "asc" ? cmp : -cmp;
}

function SortIcon({
  field,
  current,
  dir,
}: {
  field: SortField;
  current: SortField;
  dir: SortDir;
}) {
  if (field !== current) {
    return <ArrowUpDown className="size-3 opacity-30" />;
  }

  return dir === "asc" ? (
    <ArrowUp className="size-3" />
  ) : (
    <ArrowDown className="size-3" />
  );
}

export function MasterGrid({ data }: { data: ModelRow[] }) {
  const { toggle, isSelected, isFull } = useCompare();
  const [sortField, setSortField] = useState<SortField>("parameters");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showBenchmarked, setShowBenchmarked] = useState(false);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" || field === "provider" ? "asc" : "desc");
    }
  }

  const filtered = useMemo(() => {
    return showBenchmarked
      ? data.filter((m) => m.scores.length > 0)
      : data;
  }, [data, showBenchmarked]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      switch (sortField) {
        case "name":
          return sortDir === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        case "provider":
          return sortDir === "asc"
            ? a.provider.name.localeCompare(b.provider.name)
            : b.provider.name.localeCompare(a.provider.name);
        case "parameters":
          return compareNullableNumber(a.parameters, b.parameters, sortDir);
        case "contextWindow":
          return compareNullableNumber(
            a.contextWindow,
            b.contextWindow,
            sortDir
          );
        case "inputCost":
          return compareNullableNumber(
            a.pricing?.inputCost,
            b.pricing?.inputCost,
            sortDir
          );
        case "outputCost":
          return compareNullableNumber(
            a.pricing?.outputCost,
            b.pricing?.outputCost,
            sortDir
          );
        case "mmlu":
        case "gpqa":
        case "math":
          return compareNullableNumber(
            getBenchmarkScore(a, sortField)?.score,
            getBenchmarkScore(b, sortField)?.score,
            sortDir
          );
      }
    });
  }, [filtered, sortField, sortDir]);

  const thBtn =
    "inline-flex items-center gap-1 cursor-pointer select-none hover:text-foreground transition-colors";

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Switch
          id="benchmarked-filter"
          checked={showBenchmarked}
          onCheckedChange={setShowBenchmarked}
        />
        <label
          htmlFor="benchmarked-filter"
          className="text-sm text-muted-foreground cursor-pointer select-none"
        >
          Show only benchmarked models
        </label>
        {showBenchmarked && (
          <span className="text-xs text-muted-foreground ml-1">
            ({filtered.length} of {data.length})
          </span>
        )}
      </div>
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]">
            <span className="sr-only">Compare</span>
          </TableHead>
          <TableHead className="sticky left-0 z-10 w-[280px] bg-background">
            <button className={thBtn} onClick={() => toggleSort("name")}>
              Model <SortIcon field="name" current={sortField} dir={sortDir} />
            </button>
          </TableHead>
          <TableHead>
            <button className={thBtn} onClick={() => toggleSort("provider")}>
              Provider{" "}
              <SortIcon
                field="provider"
                current={sortField}
                dir={sortDir}
              />
            </button>
          </TableHead>
          <TableHead className="text-right">
            <button className={thBtn} onClick={() => toggleSort("parameters")}>
              Params{" "}
              <SortIcon
                field="parameters"
                current={sortField}
                dir={sortDir}
              />
            </button>
          </TableHead>
          <TableHead className="text-right">
            <button
              className={thBtn}
              onClick={() => toggleSort("contextWindow")}
            >
              Context{" "}
              <SortIcon
                field="contextWindow"
                current={sortField}
                dir={sortDir}
              />
            </button>
          </TableHead>
          <TableHead className="text-right">
            <button className={thBtn} onClick={() => toggleSort("inputCost")}>
              Cost In{" "}
              <SortIcon
                field="inputCost"
                current={sortField}
                dir={sortDir}
              />
            </button>
          </TableHead>
          <TableHead className="text-right">
            <button className={thBtn} onClick={() => toggleSort("outputCost")}>
              Cost Out{" "}
              <SortIcon
                field="outputCost"
                current={sortField}
                dir={sortDir}
              />
            </button>
          </TableHead>
          {BENCHMARK_TRIO.map((benchmark) => (
            <TableHead key={benchmark.slug} className="text-right">
              <button
                className={thBtn}
                onClick={() => toggleSort(benchmark.slug)}
              >
                {benchmark.label}{" "}
                <SortIcon
                  field={benchmark.slug}
                  current={sortField}
                  dir={sortDir}
                />
              </button>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((model) => {
          const selected = isSelected(model.slug);
          const disabled = !selected && isFull;

          return (
            <TableRow key={model.id} data-selected={selected || undefined}>
              <TableCell>
                <Checkbox
                  checked={selected}
                  disabled={disabled}
                  onCheckedChange={() => toggle(model.slug)}
                  aria-label={`Compare ${model.name}`}
                />
              </TableCell>
              <TableCell className="sticky left-0 z-10 bg-background font-medium">
                <div className="flex flex-col">
                  <Link
                    href={`/models/${model.slug}`}
                    className="max-w-[250px] truncate text-sm font-semibold text-foreground hover:underline"
                  >
                    {model.name}
                  </Link>
                  <span className="max-w-[250px] truncate text-xs text-muted-foreground">
                    {model.slug}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{model.provider.name}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {model.parameters != null ? (
                  `${model.parameters}B`
                ) : (
                  <span className="text-muted-foreground">Proprietary</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatContext(model.contextWindow)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums",
                  model.pricing?.inputCost === 0 && "text-green-500"
                )}
              >
                {formatCost(model.pricing?.inputCost)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums",
                  model.pricing?.outputCost === 0 && "text-green-500"
                )}
              >
                {formatCost(model.pricing?.outputCost)}
              </TableCell>
              {BENCHMARK_TRIO.map((benchmark) => {
                const score = getBenchmarkScore(model, benchmark.slug);

                return (
                  <TableCell
                    key={benchmark.slug}
                    className="text-right tabular-nums"
                  >
                    {formatScore(score?.score, score?.metricType)}
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </>
  );
}
