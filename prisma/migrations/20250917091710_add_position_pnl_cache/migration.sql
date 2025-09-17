-- CreateTable
CREATE TABLE "public"."position_pnl_cache" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "currentValue" TEXT NOT NULL,
    "currentCostBasis" TEXT NOT NULL,
    "collectedFees" TEXT NOT NULL,
    "unclaimedFees" TEXT NOT NULL,
    "realizedPnL" TEXT NOT NULL,
    "unrealizedPnL" TEXT NOT NULL,
    "totalPnL" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "poolTick" INTEGER,
    "poolSqrtPriceX96" TEXT,

    CONSTRAINT "position_pnl_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "position_pnl_cache_positionId_key" ON "public"."position_pnl_cache"("positionId");

-- CreateIndex
CREATE INDEX "position_pnl_cache_positionId_isValid_idx" ON "public"."position_pnl_cache"("positionId", "isValid");

-- CreateIndex
CREATE INDEX "position_pnl_cache_calculatedAt_idx" ON "public"."position_pnl_cache"("calculatedAt");

-- AddForeignKey
ALTER TABLE "public"."position_pnl_cache" ADD CONSTRAINT "position_pnl_cache_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "public"."positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
