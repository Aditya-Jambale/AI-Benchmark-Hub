/**
 * Manual patch for the 8 models missing summary/releaseDate after OpenRouter ingestion.
 *
 * Usage: npx tsx src/lib/ingestion/patch-missing.ts
 */

import { prisma } from "@/lib/prisma";

const PATCHES: { slug: string; summary: string; releaseDate: string }[] = [
  {
    slug: "baidu/qianfan-ocr-fast:free",
    summary: "A domain-specific multimodal large model purpose-built for OCR, leveraging specialized training data for upgraded performance.",
    releaseDate: "2026-04-20T00:00:00Z",
  },
  {
    slug: "inclusionai/ring-2.6-1t:free",
    summary: "A 1T-parameter-scale mixture-of-experts model with 63B active parameters and a 262K context window, designed for agentic workflows.",
    releaseDate: "2026-05-07T00:00:00Z",
  },
  {
    slug: "x-ai/grok-3",
    summary: "xAI's flagship reasoning model trained on the Colossus supercomputer cluster, providing advanced logic capabilities.",
    releaseDate: "2025-02-17T00:00:00Z",
  },
  {
    slug: "x-ai/grok-3-beta",
    summary: "xAI's flagship reasoning model trained on the Colossus supercomputer cluster, providing advanced logic capabilities.",
    releaseDate: "2025-02-17T00:00:00Z",
  },
  {
    slug: "x-ai/grok-3-mini",
    summary: "A highly efficient, lower-parameter variant of the Grok 3 reasoning model optimized for speed.",
    releaseDate: "2025-02-17T00:00:00Z",
  },
  {
    slug: "x-ai/grok-3-mini-beta",
    summary: "A highly efficient, lower-parameter variant of the Grok 3 reasoning model optimized for speed.",
    releaseDate: "2025-02-17T00:00:00Z",
  },
  {
    slug: "x-ai/grok-4",
    summary: "Grok 4 is xAI's advanced text generation model, trained using reinforcement learning on a massive 200,000-GPU cluster.",
    releaseDate: "2025-07-09T00:00:00Z",
  },
  {
    slug: "x-ai/grok-code-fast-1",
    summary: "A specialized variant of the Grok family optimized for high-speed code generation and reasoning tasks.",
    releaseDate: "2025-07-09T00:00:00Z",
  },
];

async function main() {
  let updated = 0;

  for (const patch of PATCHES) {
    const result = await prisma.model.updateMany({
      where: { slug: patch.slug },
      data: {
        summary: patch.summary,
        releaseDate: new Date(patch.releaseDate),
      },
    });

    if (result.count > 0) {
      console.log(`  ${patch.slug}: patched`);
      updated++;
    } else {
      console.warn(`  ${patch.slug}: not found in database`);
    }
  }

  console.log(`\nPatched ${updated}/${PATCHES.length} models.`);

  // Verify 100% coverage
  const total = await prisma.model.count();
  const withBoth = await prisma.model.count({
    where: { summary: { not: null }, releaseDate: { not: null } },
  });
  console.log(`Coverage: ${withBoth}/${total} (${((withBoth / total) * 100).toFixed(1)}%)`);
}

main()
  .catch((err) => {
    console.error("Patch failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
