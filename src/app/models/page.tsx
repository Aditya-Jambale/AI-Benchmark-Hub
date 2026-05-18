import { prisma } from "@/lib/prisma";
import { MasterGrid, type ModelRow } from "@/components/domain/MasterGrid";

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  let rows: ModelRow[] = [];

  try {
    const models = await prisma.model.findMany({
      include: {
        provider: true,
        pricing: true,
        scores: {
          include: { benchmark: true },
        },
      },
      orderBy: [{ parameters: "desc" }, { name: "asc" }],
    });

    // Prisma returns nulls first for desc; push nulls to the end
    const sorted = models.sort((a, b) => {
      if (a.parameters == null && b.parameters == null)
        return a.name.localeCompare(b.name);
      if (a.parameters == null) return 1;
      if (b.parameters == null) return -1;
      if (b.parameters !== a.parameters) return b.parameters - a.parameters;
      return a.name.localeCompare(b.name);
    });

    rows = sorted.map((m) => ({
      id: m.id,
      slug: m.slug,
      name: m.name,
      parameters: m.parameters,
      contextWindow: m.contextWindow,
      provider: {
        name: m.provider.name,
        slug: m.provider.slug,
      },
      pricing: m.pricing
        ? { inputCost: m.pricing.inputCost, outputCost: m.pricing.outputCost }
        : null,
      scores: m.scores.map((score) => ({
        benchmarkSlug: score.benchmark.slug,
        benchmarkName: score.benchmark.name,
        metricType: score.benchmark.metricType,
        score: score.score,
      })),
    }));
  } catch (error) {
    console.warn("ModelsPage: database unreachable.", error instanceof Error ? error.message : error);
  }

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight font-heading">
            Model Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length > 0
              ? `${rows.length} models tracked across ${new Set(rows.map((r) => r.provider.slug)).size} providers`
              : "Database unavailable — please check your connection."}
          </p>
        </div>
        <MasterGrid data={rows} />
      </div>
    </main>
  );
}
