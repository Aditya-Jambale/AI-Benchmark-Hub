/**
 * Normalized data shape that all ingestion adapters must output
 * before handing off to the Prisma upsert pipeline.
 */
export interface NormalizedModelData {
  slug: string; // e.g., "meta-llama/llama-3-70b-instruct"
  provider: string; // e.g., "Meta"
  name: string; // e.g., "Llama 3 70B Instruct"
  parameters: number | null; // Stored in billions (e.g., 70). Null if closed-source.
  contextWindow: number; // Stored as integer (e.g., 128000)
  inputCostPer1M: number;
  outputCostPer1M: number;
  summary?: string; // Short description from source API
  releaseDate?: Date; // Parsed from source API timestamp
  benchmarks: {
    benchmarkId: string; // e.g., "mmlu", "elo", "gpqa"
    score: number;
  }[];
}
