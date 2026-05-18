"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { RadarDatum } from "@/types";

interface BenchmarkRadarProps {
  data: RadarDatum[];
  modelName: string;
}

export function BenchmarkRadar({ data, modelName }: BenchmarkRadarProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No benchmark scores available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid
          stroke="var(--border)"
          strokeDasharray="3 3"
        />
        <PolarAngleAxis
          dataKey="benchmark"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
        />
        <Radar
          name={modelName}
          dataKey="model"
          stroke="var(--chart-1)"
          fill="var(--chart-1)"
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <Radar
          name="Category Avg"
          dataKey="average"
          stroke="var(--chart-3)"
          fill="var(--chart-3)"
          fillOpacity={0.1}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: 12,
            color: "var(--card-foreground)",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
