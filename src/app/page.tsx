import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Search, Coins, Database, Trophy, ArrowRight, Star, Zap, Sparkles, Code } from "lucide-react";

export const dynamic = "force-dynamic";

const HOME_BENCHMARKS = [
  { category: "Human Preference", slug: "elo", label: "Arena Elo" },
  { category: "Engineering", slug: "swe-bench", label: "SWE-bench" },
  { category: "Raw Intelligence", slug: "mmlu", label: "MMLU" },
] as const;

function formatCost(value: number | null | undefined): string {
  if (value == null) return "-";
  if (value === 0) return "Free";
  if (value < 0.01) return "<$0.01";
  return `$${value.toFixed(2)}`;
}

function formatScore(score: number, metricType: string): string {
  if (metricType === "elo") return Math.round(score).toLocaleString();

  const value = score <= 1 ? score * 100 : score;
  return value.toFixed(1);
}

export default async function HomePage() {
  let totalModels = 0;
  let activeBenchmarks = 0;
  let recentModels: Awaited<ReturnType<typeof prisma.model.findMany<{
    take: 5;
    where: { releaseDate: { not: null } };
    orderBy: { releaseDate: "desc" };
    include: { provider: true; pricing: true };
  }>>> = [];
  let leaders: any[] = [];
  let avgInputCost: number | null = null;
  let dbAvailable = true;

  try {
    const leaderPromises = HOME_BENCHMARKS.map((benchmark) =>
      prisma.modelBenchmarkScore.findFirst({
        where: { benchmark: { slug: benchmark.slug } },
        orderBy: { score: "desc" },
        include: {
          benchmark: true,
          model: {
            include: {
              provider: true,
              pricing: true,
            },
          },
        },
      })
    );

    const [
      _totalModels,
      _activeBenchmarks,
      _recentModels,
      _avgCost,
      ..._leaders
    ] = await Promise.all([
      prisma.model.count(),
      prisma.benchmark.count({ where: { scores: { some: {} } } }),
      prisma.model.findMany({
        take: 5,
        where: { releaseDate: { not: null }, scores: { some: {} } },
        orderBy: { releaseDate: "desc" },
        include: { provider: true, pricing: true },
      }),
      prisma.pricing.aggregate({
        where: { inputCost: { gte: 0 } },
        _avg: { inputCost: true },
      }),
      ...leaderPromises,
    ]);

    totalModels = _totalModels;
    activeBenchmarks = _activeBenchmarks;
    recentModels = _recentModels;
    avgInputCost = _avgCost._avg.inputCost;
    leaders = _leaders;
  } catch (error) {
    console.warn("HomePage: database unreachable, rendering offline state.", error instanceof Error ? error.message : error);
    dbAvailable = false;
  }

  const statCards = [
    { label: "Total Models Tracked", value: dbAvailable ? totalModels.toLocaleString() : "-" },
    { label: "Active Benchmarks", value: dbAvailable ? activeBenchmarks.toLocaleString() : "-" },
    {
      label: "Avg Input Cost / 1M",
      value: avgInputCost
        ? `$${avgInputCost.toFixed(2)}`
        : "-",
    },
  ];

  return (
    <main className="flex-1 relative pb-20">
      <div className="aurora-bg" />
      <div className="absolute inset-0 bg-grid-pattern opacity-50 z-[-1]" />
      
      <div className="mx-auto max-w-[1400px] px-6 py-16">
        <section className="mb-20 flex flex-col items-center text-center">
          <Badge variant="outline" className="mb-6 rounded-full px-4 py-1.5 border-white/20 bg-white/5 backdrop-blur-md">
            v1.0 • Now tracking 300+ frontier models
          </Badge>
          <h1 className="mb-6 text-5xl md:text-7xl font-bold tracking-tight font-heading text-gradient drop-shadow-lg">
            Navigate the AI Frontier
          </h1>
          <p className="mb-10 max-w-2xl text-lg text-muted-foreground/90">
            Real-time performance metrics, cost analysis, and benchmarks for every foundation model.
            Stop guessing, start comparing.
          </p>
          
          <div className="w-full max-w-xl relative group">
            <Link href="/models" className="block">
              <div className="glass-card glass-card-hover flex h-14 w-full items-center justify-between rounded-full px-6 transition-all ring-1 ring-white/10 group-hover:ring-teal-500/50">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Search className="h-5 w-5" />
                  <span className="text-sm">Search by model, provider, or capability...</span>
                </div>
                <kbd className="hidden rounded border border-white/20 bg-white/5 px-2 py-1 text-[10px] text-muted-foreground sm:inline-flex shadow-sm">
                  CMD K
                </kbd>
              </div>
            </Link>
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-teal-500 rounded-full blur opacity-0 group-hover:opacity-20 transition duration-500 -z-10" />
          </div>
        </section>

        <section className="mb-20 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="glass-card glass-card-hover flex flex-col rounded-2xl p-6 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                {card.label.includes("Cost") ? <Coins className="h-16 w-16" /> : <Database className="h-16 w-16" />}
              </div>
              <span className="mb-2 text-xs uppercase tracking-widest text-muted-foreground font-medium z-10">
                {card.label}
              </span>
              <span className="text-4xl font-bold tabular-nums z-10 text-white/90">
                {card.value}
              </span>
            </div>
          ))}
        </section>

        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight font-heading flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Leaderboard Overview
            </h2>
            <Link href="/benchmarks" className="text-sm text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors">
              View all benchmarks <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Leader: Elo (Human Preference) */}
            <div className="md:col-span-2 glass-card glass-card-hover rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between min-h-[240px]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full" />
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30 mb-6">
                  <Star className="h-3.5 w-3.5 fill-indigo-300" /> Human Preference (Arena Elo)
                </span>
                {leaders[0] ? (
                  <Link href={`/models/${leaders[0].model.slug}`} className="group block">
                    <h3 className="text-3xl font-bold mb-2 group-hover:text-indigo-400 transition-colors">
                      {leaders[0].model.name}
                    </h3>
                    <p className="text-muted-foreground">{leaders[0].model.provider.name}</p>
                    {leaders[0].model.summary && (
                      <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground/80 line-clamp-2">
                        {leaders[0].model.summary}
                      </p>
                    )}
                    <div className="mt-6 flex items-baseline gap-2">
                      <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50">
                        {formatScore(leaders[0].score, leaders[0].benchmark.metricType)}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground">Elo</span>
                    </div>
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Awaiting scores</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {/* Engineering: SWE-bench */}
              <div className="glass-card glass-card-hover rounded-3xl p-6 flex flex-col justify-between flex-1">
                <span className="text-xs uppercase tracking-widest text-teal-400 font-medium mb-4 flex items-center gap-1.5">
                  <Code className="h-4 w-4" /> Engineering (SWE-bench)
                </span>
                {leaders[1] ? (
                  <Link href={`/models/${leaders[1].model.slug}`} className="group">
                    <h4 className="text-xl font-bold group-hover:text-teal-300 transition-colors">{leaders[1].model.name}</h4>
                    <p className="text-xs text-muted-foreground mb-1">{leaders[1].model.provider.name}</p>
                    {leaders[1].model.summary && (
                      <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-3">{leaders[1].model.summary}</p>
                    )}
                    <span className="text-2xl font-bold">{formatScore(leaders[1].score, leaders[1].benchmark.metricType)}</span>
                  </Link>
                ) : <span className="text-muted-foreground text-sm">Awaiting</span>}
              </div>

              {/* Raw Intelligence: MMLU */}
              <div className="glass-card glass-card-hover rounded-3xl p-6 flex flex-col justify-between flex-1 relative overflow-hidden">
                <div className="absolute bottom-0 right-0 p-2 opacity-5"><Zap className="w-24 h-24" /></div>
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-medium mb-4 flex items-center gap-1.5">
                  <Zap className="h-4 w-4" /> Raw Intelligence (MMLU)
                </span>
                {leaders[2] ? (
                  <Link href={`/models/${leaders[2].model.slug}`} className="group relative z-10">
                    <h4 className="text-xl font-bold group-hover:text-emerald-300 transition-colors line-clamp-1">{leaders[2].model.name}</h4>
                    <p className="text-xs text-muted-foreground mb-1">{leaders[2].model.provider.name}</p>
                    {leaders[2].model.summary && (
                      <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-3">{leaders[2].model.summary}</p>
                    )}
                    <span className="text-2xl font-bold">{formatScore(leaders[2].score, leaders[2].benchmark.metricType)}</span>
                  </Link>
                ) : <span className="text-muted-foreground text-sm">Awaiting</span>}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight font-heading flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Latest Drops
            </h2>
            <Link
              href="/models"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {recentModels.map((model) => (
              <Link
                key={model.id}
                href={`/models/${model.slug}`}
                className="group glass-card glass-card-hover flex flex-col rounded-2xl p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <Badge variant="secondary" className="bg-white/5 border-white/10 group-hover:bg-purple-500/20 group-hover:text-purple-300 transition-colors">
                    {model.provider.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(model.releaseDate!).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
                <span className="line-clamp-2 text-sm font-semibold group-hover:text-purple-300 transition-colors">
                  {model.name}
                </span>
              </Link>
            ))}
            {recentModels.length === 0 && (
              <div className="col-span-full px-5 py-8 text-center text-sm text-muted-foreground">
                No models ingested yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
