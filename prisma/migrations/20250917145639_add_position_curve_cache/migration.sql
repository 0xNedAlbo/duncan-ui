-- CreateTable
CREATE TABLE "public"."position_curve_cache" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "curveData" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "poolTick" INTEGER,
    "poolSqrtPriceX96" TEXT,
    "pnlCacheVersion" TEXT,

    CONSTRAINT "position_curve_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "position_curve_cache_positionId_key" ON "public"."position_curve_cache"("positionId");

-- CreateIndex
CREATE INDEX "position_curve_cache_positionId_isValid_idx" ON "public"."position_curve_cache"("positionId", "isValid");

-- CreateIndex
CREATE INDEX "position_curve_cache_calculatedAt_idx" ON "public"."position_curve_cache"("calculatedAt");

-- AddForeignKey
ALTER TABLE "public"."position_curve_cache" ADD CONSTRAINT "position_curve_cache_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "public"."positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
