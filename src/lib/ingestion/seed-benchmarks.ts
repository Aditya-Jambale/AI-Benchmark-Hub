/**
 * Ensures the required Benchmark records exist in the database.
 * Run before scraping to guarantee benchmark IDs are available for score upserts.
 *
 * Usage: npx tsx src/lib/ingestion/seed-benchmarks.ts
 */

import { prisma } from "../prisma";

const BENCHMARKS = [
  { slug: "mmlu", name: "MMLU (5-shot)", metricType: "percentage" },
  { slug: "gpqa", name: "GPQA", metricType: "percentage" },
  { slug: "math", name: "MATH (Lvl 5)", metricType: "percentage" },
  { slug: "ifeval", name: "IFEval", metricType: "percentage" },
  { slug: "elo", name: "Arena Elo", metricType: "elo" },
  { slug: "swe-bench", name: "SWE-bench Verified", metricType: "percentage" },
];

export async function seedBenchmarks() {
  for (const bench of BENCHMARKS) {
    await prisma.benchmark.upsert({
      where: { slug: bench.slug },
      update: { name: bench.name, metricType: bench.metricType },
      create: bench,
    });
  }
  console.log(`Seeded ${BENCHMARKS.length} benchmarks.`);
}

if (require.main === module) {
  seedBenchmarks()
    .catch((err) => {
      console.error("Benchmark seeding failed:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
