/**
 * Populate source-backed model metadata from OpenRouter.
 *
 * OpenRouter exposes `created` and `description` fields in its public model
 * index. This script updates only the highest-priority tracked models that
 * have a matching OpenRouter id and a verified source field.
 *
 * Usage:
 *   npx tsx src/lib/metadata/enrich-openrouter.ts --limit=50
 *   npx tsx src/lib/metadata/enrich-openrouter.ts --limit=50 --dry-run
 */

import { prisma } from "@/lib/prisma";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const DEFAULT_LIMIT = 50;

interface OpenRouterModelMetadata {
  id: string;
  created?: number;
  description?: string;
}

interface OpenRouterResponse {
  data: OpenRouterModelMetadata[];
}

function getArgNumber(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  if (!arg) return fallback;

  const parsed = Number(arg.slice(prefix.length));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function cleanSummary(description: string | undefined): string | null {
  if (!description) return null;

  const cleaned = description
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length === 0) return null;
  return cleaned.length > 700 ? `${cleaned.slice(0, 697).trim()}...` : cleaned;
}

function parseReleaseDate(created: number | undefined): Date | null {
  if (!created || !Number.isFinite(created)) return null;

  const millis = created > 10_000_000_000 ? created : created * 1000;
  const date = new Date(millis);
  return Number.isNaN(date.getTime()) ? null : date;
}

function priorityScore(model: {
  contextWindow: number;
  pricing: { inputCost: number; outputCost: number } | null;
  scores: { score: number; benchmark: { metricType: string } }[];
}): number {
  const bestScore = model.scores.reduce((best, entry) => {
    const normalized =
      entry.benchmark.metricType === "elo"
        ? entry.score / 16
        : entry.score <= 1
          ? entry.score * 100
          : entry.score;
    return Math.max(best, normalized);
  }, 0);

  const hasPricing = model.pricing ? 25 : 0;
  const contextBonus = Math.min(model.contextWindow / 100_000, 25);
  return bestScore * 10 + model.scores.length * 20 + hasPricing + contextBonus;
}

async function fetchOpenRouterMetadata(): Promise<Map<string, OpenRouterModelMetadata>> {
  const response = await fetch(OPENROUTER_MODELS_URL);
  if (!response.ok) {
    throw new Error(
      `OpenRouter metadata request failed: ${response.status} ${response.statusText}`
    );
  }

  const json = (await response.json()) as OpenRouterResponse;
  return new Map(json.data.map((model) => [model.id, model]));
}

async function main() {
  const limit = getArgNumber("limit", DEFAULT_LIMIT);
  const dryRun = process.argv.includes("--dry-run");
  const openRouterModels = await fetchOpenRouterMetadata();

  const trackedModels = await prisma.model.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      contextWindow: true,
      pricing: {
        select: {
          inputCost: true,
          outputCost: true,
        },
      },
      scores: {
        select: {
          score: true,
          benchmark: {
            select: {
              metricType: true,
            },
          },
        },
      },
    },
  });

  const topModels = trackedModels
    .map((model) => ({ model, priority: priorityScore(model) }))
    .sort((a, b) => b.priority - a.priority || a.model.name.localeCompare(b.model.name))
    .slice(0, limit);

  let updated = 0;
  let skipped = 0;

  for (const { model } of topModels) {
    const source = openRouterModels.get(model.slug);
    const releaseDate = parseReleaseDate(source?.created);
    const summary = cleanSummary(source?.description);

    if (!source || (!releaseDate && !summary)) {
      skipped++;
      console.warn(`No source metadata for ${model.slug}`);
      continue;
    }

    if (dryRun) {
      console.log(
        `[dry-run] ${model.slug}: releaseDate=${releaseDate?.toISOString() ?? "none"}, summary=${summary ? "yes" : "none"}`
      );
      updated++;
      continue;
    }

    const data: { releaseDate?: Date; summary?: string } = {};
    if (releaseDate) data.releaseDate = releaseDate;
    if (summary) data.summary = summary;

    await prisma.model.update({
      where: { id: model.id },
      data,
    });
    updated++;
  }

  console.log(
    `${dryRun ? "Validated" : "Updated"} ${updated} model metadata records from ${OPENROUTER_MODELS_URL}; skipped ${skipped}.`
  );
}

main()
  .catch((error) => {
    console.error("Metadata enrichment failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
