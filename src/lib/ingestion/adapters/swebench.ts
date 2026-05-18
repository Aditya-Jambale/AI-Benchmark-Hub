/**
 * SWE-bench Verified leaderboard scraper.
 *
 * Uses Playwright to headlessly navigate swebench.com,
 * wait for the table to render, and extract model resolve rates.
 *
 * Target: https://swebench.com (Verified tab, default)
 */

import { chromium, type Browser, type Page } from "playwright";
import { prisma } from "../../prisma";
import type { ScrapedScore } from "./huggingface";

const SWE_BENCH_URL = "https://swebench.com";
const MAX_SCRAPE_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 3000;
const TABLE_SELECTOR = "table";
const ROW_SELECTOR = "table tbody tr";

const BENCHMARK_SLUG = "swe-bench";

/**
 * Normalize a model name for matching:
 * - strip emoji prefixes and leading newlines (e.g. "🆕\nClaude Opus" → "Claude Opus")
 * - lowercase
 * - strip org prefix if present
 * - remove common suffixes
 * - collapse whitespace
 */
function normalizeModelName(name: string): string {
  return name
    .replace(/^[\p{Emoji_Presentation}\p{Emoji}️‍\u{1F1E0}-\u{1F1FF}\n\r\s]+/u, "")
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-hf$/, "")
    .replace(/-gguf$/, "")
    .replace(/-gptq$/, "")
    .replace(/-awq$/, "")
    .replace(/^.*\//, "")
    .replace(/\(.*?\)/g, "") // strip parenthetical qualifiers like "(high reasoning)"
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();
}

let dbModelCache: { slug: string; normalized: string }[] | null = null;

async function getDbModels() {
  if (!dbModelCache) {
    const dbModels = await prisma.model.findMany({
      select: { slug: true },
    });
    dbModelCache = dbModels.map((model) => ({
      slug: model.slug,
      normalized: normalizeModelName(model.slug),
    }));
  }
  return dbModelCache;
}

/**
 * Try to match a SWE-bench model name to an existing DB model slug.
 */
async function matchModelToDb(modelName: string): Promise<string | null> {
  const normalizedInput = normalizeModelName(modelName);
  const dbModels = await getDbModels();

  // Exact match on slug
  for (const m of dbModels) {
    if (m.slug.toLowerCase() === modelName.toLowerCase()) return m.slug;
  }

  // Exact match on normalized
  for (const m of dbModels) {
    if (m.normalized === normalizedInput) return m.slug;
  }

  // Suffix match
  for (const m of dbModels) {
    if (m.normalized.endsWith(normalizedInput)) return m.slug;
    if (normalizedInput.endsWith(m.normalized)) return m.slug;
  }

  // Fuzzy: check if input contains the DB slug's model part
  for (const m of dbModels) {
    const slugParts = m.slug.split("/");
    const modelPart = slugParts[slugParts.length - 1];
    if (normalizedInput.includes(normalizeModelName(modelPart))) return m.slug;
  }

  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scrape the SWE-bench Verified leaderboard from swebench.com.
 * Returns an array of ScrapedScore with resolve rates matched to DB models.
 */
export async function scrapeSweBench(): Promise<ScrapedScore[]> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });

    for (let attempt = 1; attempt <= MAX_SCRAPE_ATTEMPTS; attempt++) {
      const page: Page = await browser.newPage();
      try {
        console.log(
          `Navigating to SWE-bench leaderboard (attempt ${attempt}/${MAX_SCRAPE_ATTEMPTS})...`
        );

        await page.goto(SWE_BENCH_URL, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
        // Wait for JS-rendered content to populate
        await page.waitForTimeout(8000);
        console.log(`Loaded ${page.url()}`);

        console.log("Waiting for SWE-bench table to load...");
        await page.waitForSelector(TABLE_SELECTOR, { timeout: 30_000 });
        await page.waitForSelector(ROW_SELECTOR, { timeout: 15_000 });
        await page.waitForTimeout(2000);

        const results = await extractScores(page);
        return results;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown scraping error";
        console.warn(
          `SWE-bench scrape attempt ${attempt} failed: ${message}`
        );

        if (attempt === MAX_SCRAPE_ATTEMPTS) {
          console.warn("SWE-bench ingestion skipped after bounded retries.");
          return [];
        }

        await delay(BASE_RETRY_DELAY_MS * attempt);
      } finally {
        await page.close();
      }
    }

    return [];
  } finally {
    if (browser) await browser.close();
  }
}

async function extractScores(page: Page): Promise<ScrapedScore[]> {
  const headers = await page.evaluate(() => {
    const ths = document.querySelectorAll("table th");
    return Array.from(ths).map((th) => (th as HTMLElement).innerText.trim());
  });

  console.log(`SWE-bench columns: ${headers.join(", ")}`);

  // Find the model name column and the resolve rate column
  const lowerHeaders = headers.map((h) => h.toLowerCase());
  const modelCol = lowerHeaders.findIndex(
    (h) => h.includes("model") || h.includes("name") || h === "method"
  );
  const scoreCol = lowerHeaders.findIndex(
    (h) =>
      h.includes("resolve") ||
      h.includes("rate") ||
      h.includes("%") ||
      h.includes("accuracy") ||
      h.includes("solved")
  );

  if (modelCol === -1 || scoreCol === -1) {
    console.warn(
      `SWE-bench: Could not identify columns. Model col: ${modelCol}, Score col: ${scoreCol}. ` +
        `Headers: ${headers.join(", ")}`
    );
    return [];
  }

  console.log(`SWE-bench: model col=${modelCol}, score col=${scoreCol}`);

  const rows = await page.evaluate((selector) => {
    const trs = document.querySelectorAll(selector);
    return Array.from(trs).map((tr) => {
      const cells = tr.querySelectorAll("td");
      return Array.from(cells).map((td) =>
        (td as HTMLElement).innerText.trim()
      );
    });
  }, ROW_SELECTOR);

  console.log(`SWE-bench: scraped ${rows.length} rows.`);

  const results: ScrapedScore[] = [];
  let skippedRows = 0;

  for (const row of rows) {
    if (row.length <= Math.max(modelCol, scoreCol)) {
      skippedRows++;
      continue;
    }

    const rawModelName = row[modelCol];
    // Strip emoji prefixes and whitespace
    const modelName = rawModelName
      .replace(
        /^[\p{Emoji_Presentation}\p{Emoji}️‍\u{1F1E0}-\u{1F1FF}\n\r\s]+/u,
        ""
      )
      .trim();

    if (
      !modelName ||
      modelName.toLowerCase() === "model" ||
      modelName.toLowerCase() === "name"
    ) {
      skippedRows++;
      continue;
    }

    const raw = row[scoreCol];
    if (!raw) {
      skippedRows++;
      continue;
    }

    const cleaned = raw.replace(/[%,\s]/g, "");
    const score = parseFloat(cleaned);
    if (isNaN(score)) {
      skippedRows++;
      continue;
    }

    // Normalize to 0-1 range (swebench.com reports percentages like 76.80)
    const normalizedScore = score > 1 ? score / 100 : score;

    const matchedSlug = await matchModelToDb(modelName);
    results.push({
      modelSlug: matchedSlug ?? modelName,
      hfModelName: modelName,
      scores: [{ benchmarkSlug: BENCHMARK_SLUG, score: normalizedScore }],
    });
  }

  const matched = results.filter((r) => r.modelSlug !== r.hfModelName);
  console.log(
    `SWE-bench summary: rows=${rows.length}, parsed=${results.length}, matched=${matched.length}, skipped=${skippedRows}.`
  );

  return results;
}
