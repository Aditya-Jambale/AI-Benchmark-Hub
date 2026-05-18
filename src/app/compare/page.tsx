import { prisma } from "@/lib/prisma";
import { CompareMatrix, type CompareModel } from "@/components/domain/CompareMatrix";
import { LayoutGrid } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ models?: string }>;
}

export default async function ComparePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const slugs = params.models
    ? params.models.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  if (slugs.length === 0) {
    return (
      <main className="flex-1">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <h1 className="text-2xl font-bold tracking-tight font-heading mb-6">
            Compare Models
          </h1>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <LayoutGrid className="size-10 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground max-w-md">
              Select up to 4 models from the{" "}
              <Link href="/models" className="text-foreground underline underline-offset-2">
                Directory
              </Link>{" "}
              using the checkboxes, then click &quot;Compare&quot; to see them side-by-side.
            </p>
          </div>
        </div>
      </main>
    );
  }

  let compareModels: CompareModel[] = [];

  try {
    const models = await prisma.model.findMany({
      where: { slug: { in: slugs.slice(0, 4) } },
      include: {
        provider: true,
        pricing: true,
        scores: {
          include: { benchmark: true },
        },
      },
    });

    // Preserve URL order
    const ordered = slugs
      .slice(0, 4)
      .map((slug) => models.find((m) => m.slug === slug))
      .filter(Boolean);

    compareModels = ordered.map((m) => ({
      id: m!.id,
      slug: m!.slug,
      name: m!.name,
      parameters: m!.parameters,
      contextWindow: m!.contextWindow,
      architecture: m!.architecture,
      license: m!.license,
      provider: { name: m!.provider.name, slug: m!.provider.slug },
      pricing: m!.pricing
        ? { inputCost: m!.pricing.inputCost, outputCost: m!.pricing.outputCost }
        : null,
      scores: m!.scores.map((s) => ({
        benchmarkId: s.benchmarkId,
        benchmarkName: s.benchmark.name,
        metricType: s.benchmark.metricType,
        score: s.score,
      })),
    }));
  } catch (error) {
    console.warn("ComparePage: database unreachable.", error instanceof Error ? error.message : error);
  }

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight font-heading">
            Compare Models
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {compareModels.length} model{compareModels.length !== 1 ? "s" : ""} selected
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card">
          <CompareMatrix models={compareModels} />
        </div>
      </div>
    </main>
  );
}
