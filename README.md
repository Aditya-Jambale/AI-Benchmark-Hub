# ModelIndex — AI Model Benchmark Hub

Data-dense comparison and benchmarking platform for AI models. Compare performance, cost, and capabilities across 360+ frontier models.

**Live:** [modelindex.netlify.app](https://modelindex.netlify.app/)

## Features

- **Model Directory** — Sortable, filterable table of 366 models with fuzzy search, parameter-class filtering, and compare toggles
- **Model Detail** — Radar charts, cost-efficiency scatter plots, specification grids, and benchmark score cards for each model
- **Compare Matrix** — Side-by-side comparison of up to 4 models across all tracked benchmarks and pricing
- **Automated Ingestion** — Daily data pipeline pulling from OpenRouter, HuggingFace, LMSYS Arena, and SWE-bench via GitHub Actions
- **Benchmark Leaderboards** — Elo, MMLU, MATH, SWE-bench, IFEval, GPQA with category-average baselines

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | PostgreSQL (Supabase) + Prisma ORM |
| Charts | Recharts |
| Search | Fuse.js (fuzzy, server-side) |
| CI/CD | GitHub Actions (daily cron) |

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://..."       # Supabase connection pooler URL
DIRECT_URL="postgresql://..."         # Supabase direct connection URL
OPENROUTER_API_KEY="sk-or-..."        # For data ingestion (optional, CI only)
```

## Project Structure

```
src/
  app/                    # Next.js App Router pages
    models/[...slug]/     # Model detail (radar, scatter, specs)
    compare/              # Side-by-side comparison matrix
    actions/              # Server actions (search)
  components/
    ui/                   # shadcn/ui primitives
    domain/               # Domain components (MasterGrid, ModelDetail, CostScatter, etc.)
  hooks/                  # React context providers (compare selection)
  lib/
    ingestion/            # Data pipeline adapters (OpenRouter, HuggingFace, LMSYS, SWE-bench)
    prisma.ts             # Prisma client singleton
    utils.ts              # cn() utility
  types/                  # Shared TypeScript interfaces
prisma/
  schema.prisma           # Database schema
  migrations/             # Prisma migrations
.github/workflows/
  ingestion.yml           # Daily data ingestion cron
```

## Data Pipeline

The ingestion pipeline runs daily at 06:00 UTC via GitHub Actions:

```bash
# Run manually
npx tsx src/lib/ingestion/run.ts
```

**Adapters:**
- **OpenRouter** — 350+ models with pricing, descriptions, and release dates
- **HuggingFace** — Open LLM Leaderboard scores (IFEval, GPQA, MMLU-PRO, MATH)
- **LMSYS** — Chatbot Arena Elo ratings
- **SWE-bench** — Software engineering benchmark scores

## Scripts

```bash
npm run dev              # Dev server (Turbopack)
npm run build            # Production build
npm run lint             # ESLint
npx tsx src/lib/ingestion/run.ts           # Full ingestion pipeline
npx tsx src/lib/ingestion/verify.ts        # Orphan model detection
```

## License

MIT
