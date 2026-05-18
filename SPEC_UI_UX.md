# Specification: UI/UX Architecture

## 1. Global Layout & Navigation
*   **Navigation Bar:** Sticky top-nav containing:
    *   **Logo:** "ModelIndex" (Placeholder name).
    *   **Search:** Command+K style global search for models/providers.
    *   **Links:** Directory, Compare, Benchmarks, About.
    *   **Theme Toggle:** Default to Dark Mode (industry standard for data-heavy AI tools).
*   **Footer:** Links to data sources (e.g., HuggingFace, OpenRouter) and a "Last Updated" timestamp for the database.

## 2. Page: Home Dashboard (`/`)
*   **Hero Section:** 
    *   Center-aligned search bar with placeholder: "Type a model name (e.g., Claude 3.5 Sonnet)..."
    *   Statistical summary cards: Total Models Tracked, Active Benchmarks, Average Token Cost (Market Index).
*   **Leaderboard Bento Grid:** 
    *   Three compact cards showing the #1 model for: **Reasoning (GPQA)**, **Coding (SWE-bench)**, and **Value (Performance/$)**.
*   **Latest Model Drops:** A vertical feed of the 5 most recently added models with their key headline stat.

## 3. Page: Model Directory (`/models`) — "The Master Grid"
This is the core of the application. It must be a **Data-Dense Table**.
*   **Column Definitions:**
    1.  **Model Name:** (Pinned left) Sticky column with Provider Logo + Name.
    2.  **Provider:** The organization (OpenAI, Anthropic, Meta, etc.).
    3.  **Params:** Parameter count (e.g., 70B, 405B) or "Proprietary".
    4.  **Context:** Context window size (e.g., 128k, 1M).
    5.  **Cost (In/Out):** Displayed as "$0.15 / $0.60" per 1M tokens.
    6.  **Benchmark Trio:** Three selectable columns for specific scores (Default: MMLU, HumanEval, GSM8K).
*   **Interaction Requirements:**
    *   **Filter Sidebar:** Multi-select for Providers, slider for Cost, toggles for "Open Weights" vs. "API Only".
    *   **Sorting:** Every column must be sortable.
    *   **Compare Toggle:** A checkbox on each row to "Add to Compare" (populates a floating bottom tray).

## 4. Page: Model Detail (`/models/[slug]`)
*   **Header:** Model name, release date, and "Model Card" summary.
*   **Visualizations Section:**
    *   **Radar Chart:** Comparing this model’s scores against the "Category Average" (e.g., comparing Llama 3 to the 70B-class average).
    *   **Cost Efficiency Plot:** A scatter plot showing where this model sits on the Performance vs. Price curve.
*   **Specification Grid:** A 2-column list of technical details (Architecture, Training Cutoff, License, etc.).
*   **Provider Links:** Links to where the model documentation or weights can be accessed.

## 5. Page: Compare Matrix (`/compare`)
*   **Dynamic Columns:** Users can add up to 4 models from the floating tray.
*   **Row-by-Row Comparison:** 
    *   Specifications (Context, Cost, Params).
    *   Benchmarks (Visual bar charts showing the delta between models).
*   **Winner Highlighting:** Automatically highlight the "best" value in green for objective metrics (lowest cost, highest score).