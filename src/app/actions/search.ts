"use server";

import Fuse from "fuse.js";
import { prisma } from "@/lib/prisma";

export interface ModelSearchResult {
  slug: string;
  name: string;
  provider: {
    name: string;
    slug: string;
  };
  contextWindow: number;
  pricing: {
    inputCost: number;
    outputCost: number;
  } | null;
  topScore: {
    benchmarkName: string;
    metricType: string;
    score: number;
  } | null;
}

interface ModelRow {
  slug: string;
  name: string;
  contextWindow: number;
  provider: { name: string; slug: string };
  pricing: { inputCost: number; outputCost: number } | null;
  scores: {
    score: number;
    benchmark: { name: string; metricType: string };
  }[];
}

function buildFuse(models: ModelRow[]): Fuse<ModelRow> {
  return new Fuse(models, {
    keys: [
      { name: "name", weight: 0.4 },
      { name: "slug", weight: 0.3 },
      { name: "provider.name", weight: 0.2 },
      { name: "provider.slug", weight: 0.1 },
    ],
    threshold: 0.35,
    includeScore: true,
    minMatchCharLength: 2,
  });
}

function topBenchmarkScore(
  scores: ModelRow["scores"]
): ModelSearchResult["topScore"] {
  if (scores.length === 0) return null;

  let best = scores[0];
  let bestNorm = normalizeScore(best.score, best.benchmark.metricType);

  for (let i = 1; i < scores.length; i++) {
    const norm = normalizeScore(
      scores[i].score,
      scores[i].benchmark.metricType
    );
    if (norm > bestNorm) {
      best = scores[i];
      bestNorm = norm;
    }
  }

  return {
    benchmarkName: best.benchmark.name,
    metricType: best.benchmark.metricType,
    score: best.score,
  };
}

function normalizeScore(score: number, metricType: string): number {
  if (metricType === "elo") return score / 16;
  return score <= 1 ? score * 100 : score;
}

export async function searchModels(
  query: string
): Promise<ModelSearchResult[]> {
  const trimmed = query.trim().slice(0, 80);
  if (trimmed.length < 2) return [];

  let models: ModelRow[];
  try {
    models = await prisma.model.findMany({
      take: 600,
      select: {
        slug: true,
        name: true,
        contextWindow: true,
        provider: { select: { name: true, slug: true } },
        pricing: { select: { inputCost: true, outputCost: true } },
        scores: {
          select: {
            score: true,
            benchmark: { select: { name: true, metricType: true } },
          },
        },
      },
    });
  } catch (error) {
    console.warn(
      "searchModels: database unreachable.",
      error instanceof Error ? error.message : error
    );
    return [];
  }

  const fuse = buildFuse(models);
  const results = fuse.search(trimmed, { limit: 8 });

  return results.map(({ item }) => ({
    slug: item.slug,
    name: item.name,
    provider: item.provider,
    contextWindow: item.contextWindow,
    pricing: item.pricing,
    topScore: topBenchmarkScore(item.scores),
  }));
}
