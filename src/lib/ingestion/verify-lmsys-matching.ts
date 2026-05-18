/**
 * Deterministic smoke checks for LMSYS Arena name matching.
 *
 * Usage: npx tsx src/lib/ingestion/verify-lmsys-matching.ts
 */

import { normalizeArenaName, selectArenaMatch } from "./adapters/lmsys";

const candidates = [
  "anthropic/claude-opus-4",
  "anthropic/claude-opus-4.7",
  "anthropic/claude-opus-4.7-fast",
  "openai/gpt-5",
  "openai/gpt-5.5",
  "x-ai/grok-4",
  "x-ai/grok-4.20",
  "google/gemini-3-pro-image-preview",
].map((slug) => ({
  slug,
  normalized: normalizeArenaName(slug.split("/").slice(1).join("/")),
}));

const cases = [
  ["Claude Opus 4", "anthropic/claude-opus-4"],
  ["Claude Opus 4.7", "anthropic/claude-opus-4.7"],
  ["Claude Opus 4.7 Fast", "anthropic/claude-opus-4.7-fast"],
  ["claude-opus-4-7-thinking", null],
  ["gemini-3-pro", null],
  ["gpt-5.5", "openai/gpt-5.5"],
  ["grok-4.20", "x-ai/grok-4.20"],
] as const;

let failures = 0;

for (const [input, expected] of cases) {
  const actual = selectArenaMatch(input, candidates);
  if (actual !== expected) {
    failures++;
    console.error(`${input}: expected ${expected}, got ${actual ?? "null"}`);
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`Verified ${cases.length} LMSYS matching cases.`);
}
