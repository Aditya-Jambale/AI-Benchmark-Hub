import type { NormalizedModelData } from "../types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/models";

interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  created?: number;
  description?: string;
  pricing: {
    prompt: string; // cost per token as string
    completion: string;
  };
  architecture?: {
    modality?: string;
  };
}

interface OpenRouterResponse {
  data: OpenRouterModel[];
}

/**
 * Extract parameter count (in billions) from a model name.
 * Matches patterns like "70B", "7B", "405B", "1.5B".
 * Returns null for proprietary/closed-source models with no visible param count.
 */
function extractParameters(name: string): number | null {
  const match = name.match(/(\d+(?:\.\d+)?)\s*[Bb]/);
  if (!match) return null;
  return parseFloat(match[1]);
}

/**
 * Derive a human-readable provider name from the OpenRouter model id.
 * "meta-llama/llama-3-70b-instruct" -> "meta-llama"
 * "openai/gpt-4o" -> "openai"
 */
function extractProvider(modelId: string): string {
  const slashIndex = modelId.indexOf("/");
  if (slashIndex === -1) return "unknown";
  return modelId.substring(0, slashIndex);
}

/**
 * Clean up OpenRouter description for display.
 * Strips markdown links, truncates to ~2 sentences, caps at 300 chars.
 */
function cleanDescription(raw: string | undefined): string | undefined {
  if (!raw) return undefined;

  const cleaned = raw
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) -> text
    .replace(/https?:\/\/\S+/g, "")           // bare URLs
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length === 0) return undefined;

  // Take first 2 sentences
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g);
  const summary = sentences ? sentences.slice(0, 2).join("").trim() : cleaned;

  return summary.length > 300 ? `${summary.slice(0, 297).trim()}...` : summary;
}

/**
 * Parse OpenRouter created timestamp (seconds or milliseconds) to Date.
 */
function parseReleaseDate(created: number | undefined): Date | undefined {
  if (!created || !Number.isFinite(created)) return undefined;
  const millis = created > 10_000_000_000 ? created : created * 1000;
  const date = new Date(millis);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Fetch all models from OpenRouter and normalize to our standard format.
 * Costs are multiplied by 1,000,000 (OpenRouter returns per-token cost).
 */
export async function fetchOpenRouterModels(): Promise<NormalizedModelData[]> {
  const headers: Record<string, string> = {};
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(OPENROUTER_API_URL, { headers });

  if (!response.ok) {
    throw new Error(
      `OpenRouter API returned ${response.status}: ${response.statusText}`
    );
  }

  const json: OpenRouterResponse = await response.json();

  return json.data.map((model): NormalizedModelData => {
    const promptCost = parseFloat(model.pricing.prompt) * 1_000_000;
    const completionCost = parseFloat(model.pricing.completion) * 1_000_000;

    return {
      slug: model.id,
      provider: extractProvider(model.id),
      name: model.name,
      parameters: extractParameters(model.name),
      contextWindow: model.context_length,
      inputCostPer1M: isNaN(promptCost) ? 0 : promptCost,
      outputCostPer1M: isNaN(completionCost) ? 0 : completionCost,
      summary: cleanDescription(model.description),
      releaseDate: parseReleaseDate(model.created),
      benchmarks: [], // OpenRouter does not provide benchmark scores
    };
  });
}
