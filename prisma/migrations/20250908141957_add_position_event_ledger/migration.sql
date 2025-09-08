-- AlterTable
ALTER TABLE "public"."positions" ADD COLUMN     "lastEventSync" TIMESTAMP(3),
ADD COLUMN     "totalEventsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalFeesCollected" TEXT NOT NULL DEFAULT '0';

-- CreateTable
CREATE TABLE "public"."position_events" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "liquidityDelta" TEXT NOT NULL,
    "token0Delta" TEXT NOT NULL,
    "token1Delta" TEXT NOT NULL,
    "collectedFee0" TEXT,
    "collectedFee1" TEXT,
    "poolPrice" TEXT NOT NULL,
    "tick" INTEGER NOT NULL,
    "valueInQuote" TEXT NOT NULL,
    "feeValueInQuote" TEXT,
    "source" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "position_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "position_events_positionId_timestamp_idx" ON "public"."position_events"("positionId", "timestamp");

-- CreateIndex
CREATE INDEX "position_events_positionId_eventType_idx" ON "public"."position_events"("positionId", "eventType");

-- CreateIndex
CREATE INDEX "position_events_transactionHash_idx" ON "public"."position_events"("transactionHash");

-- CreateIndex
CREATE UNIQUE INDEX "position_events_transactionHash_positionId_eventType_key" ON "public"."position_events"("transactionHash", "positionId", "eventType");

-- AddForeignKey
ALTER TABLE "public"."position_events" ADD CONSTRAINT "position_events_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "public"."positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
