/**
 * Generate 1-sentence technical summaries for benchmarked models missing a summary.
 * Uses OpenRouter's free models via OpenAI-compatible endpoint.
 *
 * Usage:
 *   npx tsx src/lib/ingestion/enrich.ts
 *   npx tsx src/lib/ingestion/enrich.ts --dry-run
 */

import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const MODEL = "openrouter/free";
const BATCH_SIZE = 5;
const DELAY_MS = 500;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;

interface ModelForEnrichment {
  id: string;
  slug: string;
  name: string;
  parameters: number | null;
  contextWindow: number;
  architecture: string | null;
  provider: { name: string };
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fn();
      if (result !== undefined && result !== null && result !== "") return result;
      throw new Error("Empty response from model");
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      console.warn(
        `  ${label}: Rate limited/Empty response. Retry attempt ${attempt + 1}/${MAX_RETRIES} (waiting ${delay}ms)...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unreachable");
}

async function generateSummary(
  client: OpenAI,
  model: ModelForEnrichment
): Promise<string> {
  const specs = [
    `Name: ${model.name}`,
    `Provider: ${model.provider.name}`,
    model.parameters != null
      ? `Parameters: ${model.parameters}B`
      : "Parameters: Proprietary",
    `Context window: ${model.contextWindow.toLocaleString()} tokens`,
    model.architecture ? `Architecture: ${model.architecture}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return withRetry(async () => {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a technical AI analyst. Write exactly one concise sentence (under 30 words) describing the model's primary use case, strengths, or distinguishing characteristics. No marketing language. No trailing period if the sentence ends with a parenthetical.",
        },
        {
          role: "user",
          content: `Write a 1-sentence technical summary for this AI model: ${specs}`,
        },
      ],
      max_tokens: 60,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content?.trim() ?? "";
  }, model.slug);
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("Error: OPENROUTER_API_KEY not set in environment or .env file.");
    process.exit(1);
  }

  const dryRun = process.argv.includes("--dry-run");
  const client = new OpenAI({
    baseURL: OPENROUTER_BASE_URL,
    apiKey,
  });

  const models = await prisma.model.findMany({
    where: {
      summary: null,
      scores: { some: {} },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      parameters: true,
      contextWindow: true,
      architecture: true,
      provider: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  if (models.length === 0) {
    console.log("All models already have summaries. Nothing to do.");
    return;
  }

  console.log(
    `${dryRun ? "[dry-run] " : ""}Enriching ${models.length} models with LLM summaries...\n`
  );

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < models.length; i += BATCH_SIZE) {
    const batch = models.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (model) => {
        const summary = await generateSummary(client, model);

        if (dryRun) {
          console.log(`  [dry-run] ${model.slug}: "${summary}"`);
          return;
        }

        await prisma.model.update({
          where: { id: model.id },
          data: { summary },
        });
        console.log(`  ${model.slug}: "${summary}"`);
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") updated++;
      else {
        failed++;
        console.error(`  Failed: ${result.reason}`);
      }
    }

    // Rate-limit between batches
    if (i + BATCH_SIZE < models.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log(
    `\n${dryRun ? "Would update" : "Updated"} ${updated} models. ${failed} failures.`
  );
}

main()
  .catch((err) => {
    console.error("Enrichment failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
