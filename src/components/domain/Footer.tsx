import { prisma } from "@/lib/prisma";

function formatTimestamp(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function Footer() {
  let latestModel: { updatedAt: Date } | null = null;
  try {
    latestModel = await prisma.model.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
  } catch (error) {
    console.warn("Footer: database unreachable, skipping last-updated timestamp.", error instanceof Error ? error.message : error);
  }

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Data sources:</span>
          <a
            href="https://openrouter.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            OpenRouter
          </a>
          <a
            href="https://huggingface.co"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            HuggingFace
          </a>
          <a
            href="https://chat.lmsys.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            LMSYS
          </a>
        </div>
        <span className="text-xs text-muted-foreground">
          Last updated: {formatTimestamp(latestModel?.updatedAt ?? null)}
        </span>
      </div>
    </footer>
  );
}
