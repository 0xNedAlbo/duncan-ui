-- CreateTable
CREATE TABLE "blockscanner_headers" (
    "id" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "hash" TEXT NOT NULL,
    "parentHash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blockscanner_headers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockscanner_watermarks" (
    "id" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "lastProcessedHeight" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blockscanner_watermarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blockscanner_headers_chain_blockNumber_idx" ON "blockscanner_headers"("chain", "blockNumber");

-- CreateIndex
CREATE INDEX "blockscanner_headers_chain_hash_idx" ON "blockscanner_headers"("chain", "hash");

-- CreateIndex
CREATE UNIQUE INDEX "blockscanner_headers_chain_blockNumber_key" ON "blockscanner_headers"("chain", "blockNumber");

-- CreateIndex
CREATE UNIQUE INDEX "blockscanner_watermarks_chain_key" ON "blockscanner_watermarks"("chain");
