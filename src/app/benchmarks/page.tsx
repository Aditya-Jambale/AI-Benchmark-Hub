import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatScore(score: number, metricType: string): string {
  if (metricType === "elo") return Math.round(score).toLocaleString();

  const value = score <= 1 ? score * 100 : score;
  return value.toFixed(1);
}

export default async function BenchmarksPage() {
  let benchmarks: Awaited<ReturnType<typeof prisma.benchmark.findMany<{
    include: {
      scores: {
        orderBy: { score: "desc" };
        take: 1;
        include: { model: { include: { provider: true } } };
      };
      _count: { select: { scores: true } };
    };
    orderBy: { slug: "asc" };
  }>>> = [];

  try {
    benchmarks = await prisma.benchmark.findMany({
      include: {
        scores: {
          orderBy: { score: "desc" },
          take: 1,
          include: {
            model: {
              include: {
                provider: true,
              },
            },
          },
        },
        _count: {
          select: {
            scores: true,
          },
        },
      },
      orderBy: { slug: "asc" },
    });
  } catch (error) {
    console.warn("BenchmarksPage: database unreachable.", error instanceof Error ? error.message : error);
  }

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight font-heading">
            Benchmarks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live benchmark definitions and current score coverage.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {benchmarks.map((benchmark) => {
            const leader = benchmark.scores[0];

            return (
              <section
                key={benchmark.id}
                className="rounded-lg border border-border p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold tracking-tight">
                      {benchmark.name}
                    </h2>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {benchmark.metricType}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {benchmark._count.scores} scores
                  </span>
                </div>

                {leader ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">
                      {leader.model.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {leader.model.provider.name}
                    </span>
                    <span className="text-2xl font-bold tabular-nums">
                      {formatScore(leader.score, benchmark.metricType)}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Awaiting ingestion data.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
