/**
 * Domain TypeScript interfaces for AI Benchmark Hub.
 *
 * These wrap Prisma-generated types for use in UI components.
 * Do not export raw Prisma types to the frontend.
 */

export interface Provider {
  id: string;
  slug: string;
  name: string;
}

export interface Pricing {
  id: string;
  modelId: string;
  inputCost: number; // Cost per 1M tokens
  outputCost: number; // Cost per 1M tokens
}

export interface Benchmark {
  id: string;
  slug: string;
  name: string; // e.g., "MMLU (5-shot)"
  metricType: string; // e.g., "percentage", "elo", "pass@1"
}

export interface BenchmarkScore {
  id: string;
  modelId: string;
  benchmarkId: string;
  score: number;
  dateRecorded: Date;
  benchmark: Benchmark;
}

/** Base model object without scores. */
export interface ModelMetadata {
  id: string;
  slug: string;
  name: string;
  providerId: string;
  parameters: number | null; // Billions. Null = proprietary.
  contextWindow: number;
  architecture: string | null; // e.g., "Dense", "MoE"
  license: string | null;
  releaseDate: Date | null;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
  provider: Provider;
  pricing: Pricing | null;
}

/** Composite type for the Master Grid — model + provider + pricing + benchmark scores. */
export interface ModelWithScores extends ModelMetadata {
  scores: BenchmarkScore[];
}

/** Data shape for the Model Detail page. Includes all scores with benchmark metadata. */
export interface ModelDetailData {
  id: string;
  slug: string;
  name: string;
  parameters: number | null;
  contextWindow: number;
  architecture: string | null;
  license: string | null;
  releaseDate: string | null;
  summary: string | null;
  createdAt: string; // ISO string for serialization
  provider: Provider;
  pricing: Pricing | null;
  scores: BenchmarkScore[];
}

/** A single point on the cost-efficiency scatter plot. */
export interface CostScatterPoint {
  name: string;
  slug: string;
  inputCost: number;
  outputCost: number;
  bestScore: number; // Best benchmark score (normalized 0-100)
  isCurrent: boolean;
}

/** A single axis on the radar chart. */
export interface RadarDatum {
  benchmark: string;
  model: number;
  average: number;
}
