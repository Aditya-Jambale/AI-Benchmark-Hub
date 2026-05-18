import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ModelDetail } from "@/components/domain/ModelDetail";
import type {
  ModelDetailData,
  RadarDatum,
  CostScatterPoint,
  BenchmarkScore,
} from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

/** Group models into parameter classes for category-average computation. */
function parameterClass(params: number | null): string {
  if (params === null) return "proprietary";
  if (params < 10) return "small";
  if (params < 30) return "medium";
  if (params < 80) return "large";
  if (params < 200) return "xl";
  return "xxl";
}

export default async function ModelDetailPage({ params }: PageProps) {
  const { slug: slugSegments } = await params;
  const slug = slugSegments.join("/");

  let model;
  try {
    model = await prisma.model.findUnique({
      where: { slug },
      include: {
        provider: true,
        pricing: true,
        scores: {
          include: { benchmark: true },
        },
      },
    });
  } catch (error) {
    console.warn("ModelDetailPage: database unreachable.", error instanceof Error ? error.message : error);
    notFound();
  }

  if (!model) notFound();

  // Fetch all models for category-average and scatter computations
  let allModels: typeof model[] = [];
  try {
    allModels = await prisma.model.findMany({
      include: {
        provider: true,
        pricing: true,
        scores: {
          include: { benchmark: true },
        },
      },
    });
  } catch {
    // Radar/scatter will render with empty comparisons — model details still available
  }

  const modelClass = parameterClass(model.parameters);

  // Compute radar data: model scores vs category average
  const classModels = allModels.filter(
    (m) => parameterClass(m.parameters) === modelClass && m.id !== model.id
  );

  const radarData: RadarDatum[] = model.scores
    .filter((score) => score.benchmark.metricType !== "elo")
    .map((score) => {
      const benchmarkScores = classModels
        .flatMap((m) => m.scores)
        .filter((s) => s.benchmarkId === score.benchmarkId);

      const avg =
        benchmarkScores.length > 0
          ? benchmarkScores.reduce((sum, s) => sum + s.score, 0) /
            benchmarkScores.length
          : 0;

      // Normalize scores for chart axes: percentages may be stored as 0-1.
      const normalize = (v: number) => (v <= 1 ? v * 100 : v);

      return {
        benchmark: score.benchmark.name,
        model: normalize(score.score),
        average: normalize(avg),
      };
    })
    .slice(0, 8); // Cap at 8 axes for readability

  // Compute scatter data: all models with pricing and at least one score
  const scatterData: CostScatterPoint[] = allModels
    .filter(
      (m) =>
        m.pricing &&
        m.pricing.inputCost >= 0 &&
        m.pricing.inputCost <= 200 &&
        m.scores.length > 0,
    )
    .map((m) => {
      const bestScore = Math.max(
        ...m.scores.map((s) =>
          s.benchmark.metricType === "elo"
            ? (s.score / 1600) * 100
            : s.score <= 1
              ? s.score * 100
            : s.score
        )
      );

      return {
        name: m.name,
        slug: m.slug,
        inputCost: m.pricing!.inputCost,
        outputCost: m.pricing!.outputCost,
        bestScore,
        isCurrent: m.id === model.id,
      };
    });

  // Serialize model data for client component
  const detailData: ModelDetailData = {
    id: model.id,
    slug: model.slug,
    name: model.name,
    parameters: model.parameters,
    contextWindow: model.contextWindow,
    architecture: model.architecture,
    license: model.license,
    releaseDate: model.releaseDate?.toISOString() ?? null,
    summary: model.summary,
    createdAt: model.createdAt.toISOString(),
    provider: {
      id: model.provider.id,
      slug: model.provider.slug,
      name: model.provider.name,
    },
    pricing: model.pricing
      ? {
          id: model.pricing.id,
          modelId: model.pricing.modelId,
          inputCost: model.pricing.inputCost,
          outputCost: model.pricing.outputCost,
        }
      : null,
    scores: model.scores.map(
      (s): BenchmarkScore => ({
        id: s.id,
        modelId: s.modelId,
        benchmarkId: s.benchmarkId,
        score: s.score,
        dateRecorded: s.dateRecorded,
        benchmark: {
          id: s.benchmark.id,
          slug: s.benchmark.slug,
          name: s.benchmark.name,
          metricType: s.benchmark.metricType,
        },
      })
    ),
  };

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <ModelDetail
          model={detailData}
          radarData={radarData}
          scatterData={scatterData}
        />
      </div>
    </main>
  );
}
