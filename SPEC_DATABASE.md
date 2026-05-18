# Specification: Database Architecture & Types

## 1. Core Principles
*   **Database Host:** Supabase (PostgreSQL)
*   **ORM:** Prisma Client
*   **Design Pattern:** Relational schema optimized for read-heavy operations. The "Master Grid" will need to join Models, Providers, Pricing, and multiple Benchmark Scores efficiently.
*   **Connection Routing:** Ensure Prisma uses the Supabase connection pooler URL (Transaction mode) for standard queries.

## 2. Prisma Schema Definitions (`prisma/schema.prisma`)
Define the following models with appropriate relations.

### A. Provider
*   `id` (UUID, Primary Key, default `uuid()`)
*   `slug` (String, Unique, e.g., "openai", "anthropic")
*   `name` (String)
*   `models` (One-to-Many relation with Model)

### B. Model
*   `id` (UUID, Primary Key, default `uuid()`)
*   `slug` (String, Unique, e.g., "claude-3-5-sonnet")
*   `name` (String)
*   `providerId` (Foreign Key -> Provider)
*   `parameters` (Float, Optional) // Stored in billions. Null means proprietary.
*   `contextWindow` (Int)
*   `architecture` (String, Optional) // e.g., "Dense", "MoE"
*   `license` (String, Optional) // e.g., "MIT", "Proprietary"
*   `pricing` (One-to-One relation with Pricing)
*   `scores` (One-to-Many relation with ModelBenchmarkScore)
*   `createdAt` & `updatedAt`

### C. Pricing
*   `id` (UUID, Primary Key, default `uuid()`)
*   `modelId` (Foreign Key -> Model, Unique)
*   `inputCost` (Float) // Cost per 1 Million tokens
*   `outputCost` (Float) // Cost per 1 Million tokens

### D. Benchmark
*   `id` (UUID, Primary Key, default `uuid()`)
*   `slug` (String, Unique, e.g., "mmlu", "swe-bench", "elo")
*   `name` (String) // e.g., "MMLU (5-shot)"
*   `metricType` (String) // e.g., "percentage", "elo", "pass@1"

### E. ModelBenchmarkScore
*   `id` (UUID, Primary Key, default `uuid()`)
*   `modelId` (Foreign Key -> Model)
*   `benchmarkId` (Foreign Key -> Benchmark)
*   `score` (Float)
*   `dateRecorded` (DateTime, default to `now()`)
*   @@unique([modelId, benchmarkId]) // A model should only have one active score per benchmark type

## 3. TypeScript Interfaces (`src/types/index.ts`)
Create shared types that map to the Prisma output. Do not export raw Prisma generated types directly to the UI components; wrap them in our own domain types:
*   `Provider`
*   `Pricing`
*   `Benchmark`
*   `ModelMetadata`: The base model object without scores.
*   `ModelWithScores`: A composite type that includes the model, its pricing, provider details, and an array of its benchmark scores. This is the primary data type for the Master Grid.