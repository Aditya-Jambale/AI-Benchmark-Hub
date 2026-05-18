/**
 * LMSYS Chatbot Arena / Arena AI scraper.
 *
 * Uses Playwright to headlessly navigate the Arena leaderboard,
 * wait for the table to render, and extract Elo ratings.
 *
 * Target: https://lmarena.ai/leaderboard (redirects to arena.ai/leaderboard)
 */

import { chromium, type Browser, type Page } from "playwright";
import { prisma } from "../../prisma";
import type { ScrapedScore } from "./huggingface";

const ARENA_URL = "https://lmarena.ai/leaderboard";

interface DbModelCandidate {
  slug: string;
  normalized: string;
}

/**
 * Normalize an LMSYS model name for matching while preserving model versions:
 * - lowercase
 * - strip provider labels and date suffixes like "-2024-05-13", "-20241022"
 * - preserve decimal versions like "4.7", "3.5", and "4.20"
 * - collapse whitespace/hyphens
 */
export function normalizeArenaName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^[a-z0-9][a-z0-9 ._-]{1,40}:\s*/, "")
    .replace(/[_\s]+/g, "-")
    .replace(/-\d{4}-\d{2}-\d{2}$/, "") // strip date: -2024-05-13
    .replace(/-\d{8}$/, "") // strip date: -20241022
    .replace(/\b(claude(?:-[a-z]+)*?)-(\d+)-(\d+)(?=-|$)/g, "$1-$2.$3")
    .replace(/[^a-z0-9./-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();
}

/**
 * Normalize a DB slug for matching: strip org prefix, normalize remainder.
 */
function normalizeDbSlug(slug: string): string {
  const parts = slug.split("/");
  const modelPart = parts.length > 1 ? parts.slice(1).join("/") : slug;
  return normalizeArenaName(modelPart);
}

function decimalVersionTokens(normalized: string): Set<string> {
  return new Set(
    normalized.match(/(?:^|-)(\d+\.\d+(?:\.\d+)*)(?=-|$)/g)?.map((token) =>
      token.replace(/^-/, "")
    ) ?? []
  );
}

function numericIdentityTokens(normalized: string): Set<string> {
  return new Set(
    normalized.match(/(?:^|-)(\d+(?:\.\d+)*[a-z]?)(?=-|$)/g)?.map((token) =>
      token.replace(/^-/, "")
    ) ?? []
  );
}

function isSubset(left: Set<string>, right: Set<string>): boolean {
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

function hasCompatibleVersionIdentity(arena: string, candidate: string): boolean {
  const arenaDecimals = decimalVersionTokens(arena);
  const candidateDecimals = decimalVersionTokens(candidate);

  if (!isSubset(arenaDecimals, candidateDecimals)) return false;

  const arenaNumbers = numericIdentityTokens(arena);
  const candidateNumbers = numericIdentityTokens(candidate);
  return isSubset(arenaNumbers, candidateNumbers);
}

function tokenOverlapScore(arena: string, candidate: string): number {
  const arenaParts = arena.split("-").filter((part) => part.length > 2);
  const candidateParts = new Set(
    candidate.split("-").filter((part) => part.length > 2)
  );
  if (arenaParts.length === 0 || candidateParts.size === 0) return 0;

  const overlap = arenaParts.filter((part) => candidateParts.has(part)).length;
  return overlap / Math.max(arenaParts.length, candidateParts.size);
}

function tokenSet(normalized: string): Set<string> {
  return new Set(normalized.split("-").filter(Boolean));
}

function hasVariantConflict(arena: string, candidate: string): boolean {
  const identityTokens = new Set(["fast", "image", "preview", "thinking"]);
  const arenaTokens = tokenSet(arena);
  const candidateTokens = tokenSet(candidate);

  for (const token of identityTokens) {
    if (arenaTokens.has(token) !== candidateTokens.has(token)) return true;
  }

  return false;
}

/**
 * Choose the best DB candidate for a normalized Arena name.
 * Exported for deterministic verification without a live database.
 */
export function selectArenaMatch(
  arenaName: string,
  dbModels: DbModelCandidate[]
): string | null {
  const normalizedArena = normalizeArenaName(arenaName);

  // Exact match on normalized slug.
  for (const model of dbModels) {
    if (model.normalized === normalizedArena) return model.slug;
  }

  const compatible = dbModels.filter((model) =>
    hasCompatibleVersionIdentity(normalizedArena, model.normalized) &&
    !hasVariantConflict(normalizedArena, model.normalized)
  );

  // Suffix/contains matches must prefer the most specific candidate.
  const contained = compatible
    .filter(
      (model) =>
        model.normalized.endsWith(normalizedArena) ||
        normalizedArena.endsWith(model.normalized) ||
        normalizedArena.includes(model.normalized)
    )
    .sort((a, b) => b.normalized.length - a.normalized.length);

  if (contained.length > 0) return contained[0].slug;

  // Guarded fuzzy match: require strong token overlap after version checks.
  const fuzzy = compatible
    .map((model) => ({
      ...model,
      score: tokenOverlapScore(normalizedArena, model.normalized),
    }))
    .filter((model) => model.score >= 0.6)
    .sort((a, b) => b.score - a.score || b.normalized.length - a.normalized.length);

  return fuzzy[0]?.slug ?? null;
}

// Cache DB models per invocation
let dbModelCache: DbModelCandidate[] | null = null;

async function getDbModels() {
  if (!dbModelCache) {
    const models = await prisma.model.findMany({ select: { slug: true } });
    dbModelCache = models.map((m) => ({
      slug: m.slug,
      normalized: normalizeDbSlug(m.slug),
    }));
  }
  return dbModelCache;
}

/**
 * Match an LMSYS arena name to an existing DB model slug.
 * Tries: exact match → suffix/contains match → fuzzy part match.
 */
async function matchModelToDb(arenaName: string): Promise<string | null> {
  const dbModels = await getDbModels();
  return selectArenaMatch(arenaName, dbModels);
}

/**
 * Scrape the Arena AI leaderboard.
 * Returns an array of ScrapedScore with Elo ratings matched to DB models.
 */
export async function scrapeLmsys(): Promise<ScrapedScore[]> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page: Page = await browser.newPage();

    console.log("Navigating to Arena AI leaderboard...");

    try {
      await page.goto(ARENA_URL, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      console.log(`Loaded: ${page.url()}`);
    } catch {
      throw new Error("Could not load the Arena leaderboard.");
    }

    // Wait for page to settle (Next.js app with dynamic content)
    await page.waitForTimeout(10000);

    // Check for runtime errors
    const pageText = await page.evaluate(() => document.body?.innerText ?? "");
    if (
      pageText.includes("Runtime error") ||
      pageText.includes("Launch timed out")
    ) {
      console.warn("Arena leaderboard is down. Skipping.");
      return [];
    }

    // Wait for tables to appear
    console.log("Waiting for leaderboard tables...");
    try {
      await page.waitForSelector("table", { timeout: 30_000 });
    } catch {
      console.warn("No tables found. Skipping.");
      return [];
    }

    await page.waitForTimeout(3000);

    // The page has multiple tables (Text, Code, Image, Video).
    // Extract all tables and find the first one with Rank/Model/Score headers.
    const tableData = await page.evaluate(() => {
      const tables = document.querySelectorAll("table");
      const results: { headers: string[]; rows: string[][] }[] = [];

      for (const table of tables) {
        const ths = table.querySelectorAll("th");
        const headers = Array.from(ths).map((th) =>
          (th as HTMLElement).innerText.trim()
        );

        const trs = table.querySelectorAll("tbody tr");
        const rows = Array.from(trs).map((tr) => {
          const cells = tr.querySelectorAll("td");
          return Array.from(cells).map((td) =>
            (td as HTMLElement).innerText.trim()
          );
        });

        if (headers.length > 0 && rows.length > 0) {
          results.push({ headers, rows });
        }
      }

      return results;
    });

    console.log(`Found ${tableData.length} tables on page.`);

    // Find the table with Rank, Model, Score columns
    let targetTable: { headers: string[]; rows: string[][] } | null = null;

    for (const table of tableData) {
      const lowerHeaders = table.headers.map((h) => h.toLowerCase());
      const hasRank = lowerHeaders.some((h) => h.includes("rank"));
      const hasModel = lowerHeaders.some(
        (h) => h.includes("model") || h.includes("name")
      );
      const hasScore = lowerHeaders.some(
        (h) => h.includes("score") || h.includes("elo") || h.includes("arena")
      );

      if (hasRank && hasModel && hasScore) {
        targetTable = table;
        break;
      }
    }

    if (!targetTable) {
      console.warn(
        "Could not find a table with Rank/Model/Score columns.",
        tableData.map((t) => t.headers)
      );
      return [];
    }

    console.log(`Using table with headers: ${targetTable.headers.join(", ")}`);

    // Identify column indices
    const headers = targetTable.headers.map((h) => h.toLowerCase());
    const modelCol = headers.findIndex(
      (h) => h.includes("model") || h.includes("name")
    );
    const scoreCol = headers.findIndex(
      (h) => h.includes("score") || h.includes("elo") || h.includes("arena")
    );

    console.log(`Model col: ${modelCol}, Score col: ${scoreCol}`);

    // Parse rows
    const results: ScrapedScore[] = [];

    for (const row of targetTable.rows) {
      if (row.length <= Math.max(modelCol, scoreCol)) continue;

      const modelName = row[modelCol];
      if (
        !modelName ||
        modelName.toLowerCase() === "model" ||
        modelName.toLowerCase() === "name"
      )
        continue;

      // Parse score — may be formatted like "1,324" or "1324"
      const scoreRaw = row[scoreCol]?.replace(/[,\s]/g, "");
      const score = parseFloat(scoreRaw);
      if (isNaN(score) || score < 500 || score > 2000) continue; // sanity check for Elo range

      const matchedSlug = await matchModelToDb(modelName);

      results.push({
        modelSlug: matchedSlug ?? modelName,
        hfModelName: modelName,
        scores: [
          {
            benchmarkSlug: "elo",
            score: score,
          },
        ],
      });
    }

    const matched = results.filter((r) => r.modelSlug !== r.hfModelName);
    console.log(
      `Matched ${matched.length}/${results.length} models to database.`
    );

    return results;
  } finally {
    if (browser) await browser.close();
  }
}
