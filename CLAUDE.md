# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

AI Model Index and Benchmark Platform — a data-dense comparison and benchmarking tool for AI models, targeting AI researchers and engineers. Currently early-stage: shadcn/ui initialized, no features built yet.

## Common Commands

```bash
npm run dev        # Start dev server (Next.js with Turbopack)
npm run build      # Production build
npm run start      # Serve production build
npm run lint       # ESLint (flat config, next/core-web-vitals + next/typescript)
```

No test framework is installed. No Prettier — ESLint only.

## Technology Stack

- **Framework:** Next.js 16.2.6 (App Router) — **breaking changes from prior versions; read `node_modules/next/dist/docs/` before writing Next.js code**
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 (CSS-based config in `globals.css`, no `tailwind.config.*`)
- **UI Components:** shadcn/ui v4 (radix-sera style, `rsc: true`, Lucide icons)
- **Database / ORM:** PostgreSQL + Prisma (not yet installed)
- **Visualizations:** Recharts (not yet installed)
- **Color system:** oklch color space, taupe/neutral palette, dark mode default (class-based `.dark`)
- **Fonts:** Geist (sans/mono), Noto Sans (`--font-sans`), Playfair Display (`--font-heading`)

## Path Aliases

`@/*` maps to `./src/*` — use `@/components/...`, `@/lib/...`, etc.

## Architecture

### App Router Pages (planned per SPEC_UI_UX.md)

| Route | Purpose |
|---|---|
| `/` | Home dashboard — search, stat cards, leaderboard grid, latest model drops |
| `/models` | Model directory — data-dense sortable/filterable table with compare toggles |
| `/models/[slug]` | Model detail — radar chart, cost scatter plot, spec grid |
| `/compare` | Compare matrix — up to 4 models side-by-side with bar charts |

### Directory Structure

- `src/app/` — Next.js App Router pages and layouts
- `src/components/ui/` — Base shadcn/ui primitives (use `npx shadcn@latest add <component>` to add)
- `src/components/domain/` — Domain-specific components (benchmark tables, comparison matrices, radar charts)
- `src/lib/` — DB clients, utility functions, scraper adapters, formatting logic
- `src/types/` — Shared TypeScript interfaces
- `prisma/` — Database schemas and migrations

### Component Patterns

- shadcn components use `data-slot`, `data-variant`, `data-size` attributes for styling
- Button component (`src/components/ui/button.tsx`) uses `class-variance-authority` with `Slot` from radix-ui for `asChild`
- Utility `cn()` in `src/lib/utils.ts` combines `clsx` + `tailwind-merge`

## Spec-Driven Workflow (SDD)

Before writing any code for a new feature or component:
1. Ask which `SPEC_*.md` file governs the current task.
2. Read the relevant specification document entirely.
3. Scaffold TypeScript types and Prisma schema updates first.
4. Build backend logic, server actions, or data ingestion scripts.
5. Build React UI components exactly as described in the layout specs.

Existing specs: `SPEC_UI_UX.md` (global layout, dashboard, model directory, model detail, compare matrix).

## Core Engineering Directives

1. **Zero Data Hallucination:** Do not hardcode fictional model data into the UI. Create strictly typed interfaces (e.g., `ModelMetadata`, `BenchmarkScore`) and build components that expect this data via props or database fetches.
2. **Component Architecture:** Strict Server/Client Component separation. Use `"use client"` only when React hooks, interactivity, or browser APIs are required.
3. **Data Density & UI:** Target audience is highly technical. Prioritize clean, high-density data tables, grids, and charts over excessive whitespace.
4. **Resilient Data Ingestion:** Assume scraper target DOMs will change. Use robust selectors, handle missing data gracefully, write pure normalization functions.
