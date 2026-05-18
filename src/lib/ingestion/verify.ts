/**
 * Data verification script — finds "orphan" models in the database.
 * An orphan is a Model with no Pricing record or zero BenchmarkScore entries.
 *
 * Usage: npx tsx src/lib/ingestion/verify.ts
 */

import { prisma } from "../prisma";

interface OrphanModel {
  slug: string;
  name: string;
  provider: string;
  hasPricing: boolean;
  scoreCount: number;
}

async function findOrphanModels(): Promise<OrphanModel[]> {
  const models = await prisma.model.findMany({
    select: {
      slug: true,
      name: true,
      provider: { select: { name: true } },
      pricing: { select: { id: true } },
      scores: { select: { id: true } },
    },
    orderBy: { name: "asc" },
  });

  return models
    .filter((m) => !m.pricing || m.scores.length === 0)
    .map((m) => ({
      slug: m.slug,
      name: m.name,
      provider: m.provider.name,
      hasPricing: !!m.pricing,
      scoreCount: m.scores.length,
    }));
}

function printTable(rows: OrphanModel[]): void {
  if (rows.length === 0) {
    console.log("\n  No orphan models found. All models have pricing and scores.\n");
    return;
  }

  const noPricing = rows.filter((r) => !r.hasPricing);
  const noScores = rows.filter((r) => r.scoreCount === 0);

  console.log(`\n  Orphan Model Report`);
  console.log(`  ${"─".repeat(70)}`);
  console.log(`  Total orphans: ${rows.length}  |  Missing pricing: ${noPricing.length}  |  Missing scores: ${noScores.length}`);
  console.log(`  ${"─".repeat(70)}\n`);

  // Column widths
  const slugW = Math.max(6, ...rows.map((r) => r.slug.length));
  const nameW = Math.max(6, ...rows.map((r) => r.name.length));
  const provW = Math.max(8, ...rows.map((r) => r.provider.length));

  const header = [
    "Slug".padEnd(slugW),
    "Name".padEnd(nameW),
    "Provider".padEnd(provW),
    "Pricing".padEnd(8),
    "Scores".padEnd(6),
  ].join("  ");

  const divider = [
    "─".repeat(slugW),
    "─".repeat(nameW),
    "─".repeat(provW),
    "─".repeat(8),
    "─".repeat(6),
  ].join("  ");

  console.log(`  ${header}`);
  console.log(`  ${divider}`);

  for (const row of rows) {
    const pricingFlag = row.hasPricing ? "  yes" : "  NO";
    const scoreFlag = row.scoreCount === 0 ? "  0" : `  ${row.scoreCount}`;
    console.log(
      [
        row.slug.padEnd(slugW),
        row.name.padEnd(nameW),
        row.provider.padEnd(provW),
        pricingFlag.padEnd(8),
        scoreFlag.padEnd(6),
      ].join("  ")
    );
  }

  console.log();
}

async function main() {
  console.log("Scanning for orphan models...\n");

  const orphans = await findOrphanModels();
  printTable(orphans);

  const totalModels = await prisma.model.count();
  console.log(`  Total models in database: ${totalModels}`);
  console.log(`  Healthy models: ${totalModels - orphans.length}`);
  console.log(
    `  Orphan rate: ${((orphans.length / totalModels) * 100).toFixed(1)}%\n`
  );
}

main()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
