/**
 * Refresh only LMSYS/Arena Elo scores.
 *
 * Usage: npx tsx src/lib/ingestion/run-lmsys.ts
 */

import { prisma } from "@/lib/prisma";
import { scrapeLmsys } from "./adapters/lmsys";

async function main() {
  const scores = await scrapeLmsys();
  const elo = await prisma.benchmark.findUnique({ where: { slug: "elo" } });
  if (!elo) throw new Error("Missing elo benchmark. Run seed-benchmarks first.");

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
            benchmarkId: elo.id,
          },
        },
        update: { score: score.score },
        create: {
          modelId: model.id,
          benchmarkId: elo.id,
          score: score.score,
        },
      });
      upserted++;
    }
  }

  console.log(
    `LMSYS refresh complete: scraped=${scores.length}, upserted=${upserted}, skipped=${skipped}.`
  );
}

main()
  .catch((error) => {
    console.error("LMSYS refresh failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
