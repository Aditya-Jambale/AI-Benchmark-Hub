# Specification: Data Ingestion & Scraping Architecture

## 1. Core Architecture
The data ingestion pipeline uses the **Adapter Pattern**. 
We do not write monolithic scraping scripts. Each data source requires a dedicated TypeScript adapter located in `/src/lib/ingestion/adapters/`. 
*   **Adapter Responsibility:** Fetch raw data, parse/scrape it, and return an array of strictly typed `NormalizedModelData` objects.
*   **Pipeline Responsibility:** Take the normalized data, check for existing records in PostgreSQL, and perform upserts (Update if exists, Insert if new).

## 2. Target Sources & Methods

### A. OpenRouter (Primary Source for Pricing & Context)
*   **Method:** REST API (JSON).
*   **Target:** `https://openrouter.ai/api/v1/models`
*   **Data to Extract:** `id` (slug), `name`, `context_length`, `pricing.prompt` (Input Cost), `pricing.completion` (Output Cost), `architecture.modality`.
*   **Normalization Rules:** OpenRouter returns costs per 1 token. You MUST multiply this by 1,000,000 to store it as "Cost per 1M tokens" (standard industry metric).

### B. HuggingFace Open LLM Leaderboard (Source for Open Weights)
*   **Method:** Headless Browser Scraping (Puppeteer or Playwright).
*   **Target:** `https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard`
*   **Data to Extract:** Model Name, Average Score, IFEval, BBH, MATH, GPQA, MUSR, MMLU-PRO.
*   **Resilience:** The table is rendered dynamically via Gradio. The scraper must wait for the `.table-wrap` selector to mount before extracting DOM elements.

### C. LMSYS Chatbot Arena (Source for Elo Ratings)
*   **Method:** Headless Browser Scraping or Gradio API intercept.
*   **Target:** `https://chat.lmsys.org/?leaderboard`
*   **Data to Extract:** Model Name, Arena Elo Rating, 95% Confidence Interval.
*   **Matching Logic:** Model names on LMSYS (e.g., `gpt-4o-2024-05-13`) must be mapped to their base model records in our database using a fuzzy-match utility or manual alias table.

## 3. Data Normalization Standard
All adapters must output data matching this TypeScript interface before it is sent to Prisma for insertion:

```typescript
interface NormalizedModelData {
  slug: string;             // e.g., "meta-llama/llama-3-70b-instruct"
  provider: string;         // e.g., "Meta"
  name: string;             // e.g., "Llama 3 70B Instruct"
  parameters: number | null;// Stored in billions (e.g., 70). Null if closed-source.
  contextWindow: number;    // Stored as integer (e.g., 128000)
  inputCostPer1M: number;
  outputCostPer1M: number;
  benchmarks: {
    benchmarkId: string;    // e.g., "mmlu", "elo", "gpqa"
    score: number;
  }[];
}