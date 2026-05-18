/**
 * Ingestion pipeline runner.
 * Takes normalized model data from adapters and upserts to PostgreSQL via Prisma.
 *
 * Usage: npx tsx src/lib/ingestion/run.ts
 */

import { prisma } from "../prisma";
import { fetchOpenRouterModels } from "./adapters/openrouter";
import { scrapeHuggingFace } from "./adapters/huggingface";
import { scrapeLmsys } from "./adapters/lmsys";
import { scrapeSweBench } from "./adapters/swebench";
import { seedBenchmarks } from "./seed-benchmarks";
import type { NormalizedModelData } from "./types";

/**
 * Upsert a batch of NormalizedModelData into the database.
 * For each model:
 *   1. Upsert the Provider (by slug)
 *   2. Upsert the Model (by slug, linking to provider)
 *   3. Upsert the Pricing (by modelId unique constraint)
 */
export async function upsertModels(
  models: NormalizedModelData[]
): Promise<void> {
  const providerSlugs = [...new Set(models.map((m) => m.provider))];
  const providerMap = new Map<string, string>();

  for (const slug of providerSlugs) {
    const provider = await prisma.provider.upsert({
      where: { slug },
      update: { name: slug },
      create: { slug, name: slug },
    });
    providerMap.set(slug, provider.id);
  }

  console.log(`Upserted ${providerMap.size} providers.`);

  let modelsCreated = 0;
  let pricingCreated = 0;

  for (const model of models) {
    const providerId = providerMap.get(model.provider);
    if (!providerId) {
      console.warn(`Skipping model "${model.slug}" — provider not found.`);
      continue;
    }

    const upsertedModel = await prisma.model.upsert({
      where: { slug: model.slug },
      update: {
        name: model.name,
        parameters: model.parameters,
        contextWindow: model.contextWindow,
        ...(model.summary !== undefined && { summary: model.summary }),
        ...(model.releaseDate !== undefined && { releaseDate: model.releaseDate }),
      },
      create: {
        slug: model.slug,
        name: model.name,
        providerId,
        parameters: model.parameters,
        contextWindow: model.contextWindow,
        summary: model.summary ?? null,
        releaseDate: model.releaseDate ?? null,
      },
    });

    modelsCreated++;

    await prisma.pricing.upsert({
      where: { modelId: upsertedModel.id },
      update: {
        inputCost: model.inputCostPer1M,
        outputCost: model.outputCostPer1M,
      },
      create: {
        modelId: upsertedModel.id,
        inputCost: model.inputCostPer1M,
        outputCost: model.outputCostPer1M,
      },
    });

    pricingCreated++;
  }

  console.log(
    `Upserted ${modelsCreated} models and ${pricingCreated} pricing records.`
  );
}

/**
 * Upsert benchmark scores from HuggingFace scraper results.
 * Matches scraped models to DB models by slug and upserts ModelBenchmarkScore records.
 */
async function upsertBenchmarkScores(
  scores: Awaited<ReturnType<typeof scrapeHuggingFace>>
): Promise<void> {
  // Load benchmark ID map
  const benchmarks = await prisma.benchmark.findMany();
  const benchmarkIdMap = new Map(benchmarks.map((b) => [b.slug, b.id]));

  let upserted = 0;
  let skipped = 0;

  for (const entry of scores) {
    // Look up the model in DB by the matched slug
    const model = await prisma.model.findUnique({
      where: { slug: entry.modelSlug },
    });

    if (!model) {
      skipped++;
      continue;
    }

    for (const score of entry.scores) {
      const benchmarkId = benchmarkIdMap.get(score.benchmarkSlug);
      if (!benchmarkId) {
        console.warn(
          `Unknown benchmark "${score.benchmarkSlug}", skipping score for ${entry.modelSlug}.`
        );
        continue;
      }

      await prisma.modelBenchmarkScore.upsert({
        where: {
          modelId_benchmarkId: {
            modelId: model.id,
            benchmarkId,
          },
        },
        update: { score: score.score },
        create: {
          modelId: model.id,
          benchmarkId,
          score: score.score,
        },
      });

      upserted++;
    }
  }

  console.log(
    `Upserted ${upserted} benchmark scores (${skipped} unmatched models skipped).`
  );
}

type AdapterResult = { adapter: string; ok: boolean; error?: string };

async function main() {
  const results: AdapterResult[] = [];

  // 1. Seed benchmark definitions
  console.log("--- Seeding benchmarks ---");
  await seedBenchmarks();

  // 2. OpenRouter: models + pricing
  console.log("\n--- OpenRouter ingestion ---");
  try {
    console.log("Fetching models from OpenRouter...");
    const models = await fetchOpenRouterModels();
    console.log(`Received ${models.length} models from OpenRouter.`);
    await upsertModels(models);
    results.push({ adapter: "openrouter", ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("OpenRouter adapter failed:", msg);
    results.push({ adapter: "openrouter", ok: false, error: msg });
  }

  // 3. HuggingFace: benchmark scores
  console.log("\n--- HuggingFace ingestion ---");
  try {
    const hfScores = await scrapeHuggingFace();
    await upsertBenchmarkScores(hfScores);
    results.push({ adapter: "huggingface", ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("HuggingFace adapter failed:", msg);
    results.push({ adapter: "huggingface", ok: false, error: msg });
  }

  // 4. SWE-bench Verified: resolve rates
  console.log("\n--- SWE-bench ingestion ---");
  try {
    const sweScores = await scrapeSweBench();
    await upsertBenchmarkScores(sweScores);
    results.push({ adapter: "swebench", ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("SWE-bench adapter failed:", msg);
    results.push({ adapter: "swebench", ok: false, error: msg });
  }

  // 5. LMSYS Chatbot Arena: Elo scores
  console.log("\n--- LMSYS ingestion ---");
  try {
    const lmsysScores = await scrapeLmsys();
    await upsertBenchmarkScores(lmsysScores);
    results.push({ adapter: "lmsys", ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("LMSYS adapter failed:", msg);
    results.push({ adapter: "lmsys", ok: false, error: msg });
  }

  // Summary
  const succeeded = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  console.log("\n=== Ingestion Summary ===");
  console.log(`${succeeded.length}/${results.length} adapters succeeded.`);
  if (failed.length > 0) {
    console.log("Failed adapters:");
    for (const f of failed) {
      console.log(`  - ${f.adapter}: ${f.error}`);
    }
  }
  console.log("========================\n");

  // Exit 0 if at least one adapter succeeded, 1 only if all failed
  if (succeeded.length === 0 && results.length > 0) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("Ingestion failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
