-- CreateTable
CREATE TABLE "public"."position_event_apr" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "periodStartDate" TIMESTAMP(3) NOT NULL,
    "periodEndDate" TIMESTAMP(3),
    "periodDays" DOUBLE PRECISION,
    "periodCostBasis" TEXT NOT NULL,
    "allocatedFees" TEXT NOT NULL DEFAULT '0',
    "periodApr" DOUBLE PRECISION,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "position_event_apr_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "position_event_apr_eventId_key" ON "public"."position_event_apr"("eventId");

-- CreateIndex
CREATE INDEX "position_event_apr_eventId_isValid_idx" ON "public"."position_event_apr"("eventId", "isValid");

-- AddForeignKey
ALTER TABLE "public"."position_event_apr" ADD CONSTRAINT "position_event_apr_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."position_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
