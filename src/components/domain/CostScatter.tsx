"use client";

import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";
import type { CostScatterPoint } from "@/types";

interface CostScatterProps {
  data: CostScatterPoint[];
}

/** Spread overlapping points so stacked models become individually visible. */
function jitterOverlappingPoints(data: CostScatterPoint[]): (CostScatterPoint & { _jx: number; _jy: number })[] {
  if (data.length === 0) return [];

  const xRange = Math.max(...data.map((d) => d.inputCost)) - Math.min(...data.map((d) => d.inputCost));
  const yRange = Math.max(...data.map((d) => d.bestScore)) - Math.min(...data.map((d) => d.bestScore));
  const xPad = (xRange || 10) * 0.015;
  const yPad = (yRange || 100) * 0.015;

  return data.map((point, _, arr) => {
    const cluster = arr.filter(
      (other) =>
        Math.abs(other.inputCost - point.inputCost) < xPad * 0.5 &&
        Math.abs(other.bestScore - point.bestScore) < yPad * 0.5,
    );

    if (cluster.length <= 1) return { ...point, _jx: point.inputCost, _jy: point.bestScore };

    const idx = cluster.findIndex((c) => c.slug === point.slug);
    const angle = (idx / cluster.length) * Math.PI * 2 + (idx % 2) * 0.3;
    const radius = (Math.floor(idx / 6) + 1) * Math.max(xPad, yPad);

    return {
      ...point,
      _jx: point.inputCost + Math.cos(angle) * radius,
      _jy: point.bestScore + Math.sin(angle) * radius,
    };
  });
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: CostScatterPoint }> }) {
  if (!active || !payload?.length) return null;

  // Deduplicate — Recharts may repeat the same point across Scatter groups
  const seen = new Set<string>();
  const points = payload
    .map((p) => p.payload)
    .filter((p) => {
      if (seen.has(p.slug)) return false;
      seen.add(p.slug);
      return true;
    });

  return (
    <div className="rounded-md border border-border bg-card p-3 text-xs shadow-md space-y-2">
      {points.map((point) => (
        <div key={point.slug}>
          <p className="font-semibold text-card-foreground">{point.name}</p>
          <p className="text-muted-foreground">
            ${point.inputCost.toFixed(2)} in / ${point.outputCost.toFixed(2)} out per 1M
          </p>
          <p className="text-card-foreground">
            Best Score: {point.bestScore.toFixed(1)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function CostScatter({ data }: CostScatterProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No pricing data available
      </div>
    );
  }

  const jittered = useMemo(() => jitterOverlappingPoints(data), [data]);
  const currentModel = jittered.filter((d) => d.isCurrent);
  const otherModels = jittered.filter((d) => !d.isCurrent);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="_jx"
          type="number"
          name="Input Cost"
          domain={[0, "dataMax"]}
          padding={{ left: 20, right: 20 }}
          minTickGap={40}
          tickFormatter={(value: number) => "$" + value.toFixed(2)}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={{ stroke: "var(--border)" }}
        >
          <Label
            value="Input Cost ($/1M tokens)"
            position="bottom"
            offset={10}
            style={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
        </XAxis>
        <YAxis
          dataKey="_jy"
          type="number"
          name="Best Score"
          domain={[0, 100]}
          padding={{ top: 20, bottom: 20 }}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={{ stroke: "var(--border)" }}
        >
          <Label
            value="Best Benchmark Score"
            angle={-90}
            position="insideLeft"
            offset={0}
            style={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
        </YAxis>
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Scatter
          name="Other Models"
          data={otherModels}
          fill="var(--chart-3)"
          fillOpacity={0.5}
          r={5}
          strokeWidth={1}
          stroke="var(--chart-3)"
          strokeOpacity={0.6}
        />
        <Scatter
          name="This Model"
          data={currentModel}
          fill="var(--chart-1)"
          r={8}
          strokeWidth={2}
          stroke="var(--chart-1)"
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
