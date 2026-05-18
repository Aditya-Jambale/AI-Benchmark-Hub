-- Add model-card metadata populated only from source-backed enrichment records.
ALTER TABLE "Model"
ADD COLUMN "releaseDate" TIMESTAMP(3),
ADD COLUMN "summary" TEXT;
