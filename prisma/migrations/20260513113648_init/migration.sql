-- CreateTable
CREATE TABLE "Provider" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerId" UUID NOT NULL,
    "parameters" DOUBLE PRECISION,
    "contextWindow" INTEGER NOT NULL,
    "architecture" TEXT,
    "license" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pricing" (
    "id" UUID NOT NULL,
    "modelId" UUID NOT NULL,
    "inputCost" DOUBLE PRECISION NOT NULL,
    "outputCost" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benchmark" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,

    CONSTRAINT "Benchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelBenchmarkScore" (
    "id" UUID NOT NULL,
    "modelId" UUID NOT NULL,
    "benchmarkId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "dateRecorded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelBenchmarkScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Provider_slug_key" ON "Provider"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Model_slug_key" ON "Model"("slug");

-- CreateIndex
CREATE INDEX "Model_providerId_idx" ON "Model"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "Pricing_modelId_key" ON "Pricing"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "Benchmark_slug_key" ON "Benchmark"("slug");

-- CreateIndex
CREATE INDEX "ModelBenchmarkScore_modelId_idx" ON "ModelBenchmarkScore"("modelId");

-- CreateIndex
CREATE INDEX "ModelBenchmarkScore_benchmarkId_idx" ON "ModelBenchmarkScore"("benchmarkId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelBenchmarkScore_modelId_benchmarkId_key" ON "ModelBenchmarkScore"("modelId", "benchmarkId");

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pricing" ADD CONSTRAINT "Pricing_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelBenchmarkScore" ADD CONSTRAINT "ModelBenchmarkScore_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelBenchmarkScore" ADD CONSTRAINT "ModelBenchmarkScore_benchmarkId_fkey" FOREIGN KEY ("benchmarkId") REFERENCES "Benchmark"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
