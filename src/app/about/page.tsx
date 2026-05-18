export default function AboutPage() {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-[900px] px-6 py-10">
        <h1 className="mb-4 text-2xl font-bold tracking-tight font-heading">
          About ModelIndex
        </h1>
        <div className="flex flex-col gap-5 text-sm leading-6 text-muted-foreground">
          <p>
            ModelIndex is a data-dense model directory for comparing frontier
            and open-weight AI models across pricing, context length, provider
            availability, and benchmark performance.
          </p>
          <p>
            The application uses OpenRouter for model availability, pricing,
            context windows, and source-backed metadata, HuggingFace Open LLM
            Leaderboard for open benchmark rows, and LMSYS/Arena data for Elo
            scores when the upstream leaderboard is reachable.
          </p>
          <p>
            Launch data is intentionally conservative: missing scores are shown
            as missing, and model-card summaries are populated only when a
            source record provides them.
          </p>
        </div>
      </div>
    </main>
  );
}
