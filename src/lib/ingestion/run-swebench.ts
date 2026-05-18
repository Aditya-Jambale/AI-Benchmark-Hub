/**
 * Refresh only SWE-bench Verified scores.
 *
 * Usage: npx tsx src/lib/ingestion/run-swebench.ts
 */

import { prisma } from "@/lib/prisma";
import { scrapeSweBench } from "./adapters/swebench";

async function main() {
  const scores = await scrapeSweBench();
  const sweBench = await prisma.benchmark.findUnique({
    where: { slug: "swe-bench" },
  });
  if (!sweBench)
    throw new Error("Missing swe-bench benchmark. Run seed-benchmarks first.");

  let upserted = 0;
  let skipped = 0;

  for (const entry of scores) {
    const model = await prisma.model.findUnique({
      where: { slug: entry.modelSlug },
    });

    if (!model) {
      skipped++;
      continue;
    }

    for (const score of entry.scores) {
      await prisma.modelBenchmarkScore.upsert({
        where: {
          modelId_benchmarkId: {
            modelId: model.id,
            benchmarkId: sweBench.id,
          },
        },
        update: { score: score.score },
        create: {
          modelId: model.id,
          benchmarkId: sweBench.id,
          score: score.score,
        },
      });
      upserted++;
    }
  }

  console.log(
    `SWE-bench refresh complete: scraped=${scores.length}, upserted=${upserted}, skipped=${skipped}.`
  );
}

main()
  .catch((error) => {
    console.error("SWE-bench refresh failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
