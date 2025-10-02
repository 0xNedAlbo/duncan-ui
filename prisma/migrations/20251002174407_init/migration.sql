-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "address" TEXT NOT NULL,
    "nonce" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verificationtokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."api_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "scopes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "monthlyUsage" INTEGER NOT NULL DEFAULT 0,
    "dailyUsage" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tokens" (
    "chain" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "logoUrl" TEXT,
    "marketCap" TEXT,
    "coinGeckoId" TEXT,
    "lastEnrichedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("chain","address")
);

-- CreateTable
CREATE TABLE "public"."pools" (
    "chain" TEXT NOT NULL,
    "poolAddress" TEXT NOT NULL,
    "protocol" TEXT NOT NULL DEFAULT 'uniswapv3',
    "token0Address" TEXT NOT NULL,
    "token1Address" TEXT NOT NULL,
    "fee" INTEGER NOT NULL,
    "tickSpacing" INTEGER NOT NULL,
    "currentTick" INTEGER,
    "currentPrice" TEXT,
    "sqrtPriceX96" TEXT,
    "feeGrowthGlobal0X128" TEXT NOT NULL DEFAULT '0',
    "feeGrowthGlobal1X128" TEXT NOT NULL DEFAULT '0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pools_pkey" PRIMARY KEY ("chain","poolAddress")
);

-- CreateTable
CREATE TABLE "public"."positions" (
    "chain" TEXT NOT NULL,
    "protocol" TEXT NOT NULL DEFAULT 'uniswapv3',
    "nftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "poolAddress" TEXT NOT NULL,
    "tickLower" INTEGER NOT NULL,
    "tickUpper" INTEGER NOT NULL,
    "liquidity" TEXT NOT NULL,
    "token0IsQuote" BOOLEAN NOT NULL,
    "owner" TEXT,
    "importType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("userId","chain","protocol","nftId")
);

-- CreateTable
CREATE TABLE "public"."position_events" (
    "id" TEXT NOT NULL,
    "positionUserId" TEXT NOT NULL,
    "positionChain" TEXT NOT NULL,
    "positionProtocol" TEXT NOT NULL,
    "positionNftId" TEXT NOT NULL,
    "ledgerIgnore" BOOLEAN NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "blockTimestamp" TIMESTAMP(3) NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "deltaL" TEXT NOT NULL,
    "liquidityAfter" TEXT NOT NULL,
    "poolPrice" TEXT NOT NULL,
    "token0Amount" TEXT NOT NULL DEFAULT '0',
    "token1Amount" TEXT NOT NULL DEFAULT '0',
    "tokenValueInQuote" TEXT NOT NULL DEFAULT '0',
    "feesCollected0" TEXT NOT NULL DEFAULT '0',
    "feesCollected1" TEXT NOT NULL DEFAULT '0',
    "feeValueInQuote" TEXT NOT NULL DEFAULT '0',
    "uncollectedPrincipal0" TEXT NOT NULL DEFAULT '0',
    "uncollectedPrincipal1" TEXT NOT NULL DEFAULT '0',
    "deltaCostBasis" TEXT NOT NULL,
    "costBasisAfter" TEXT NOT NULL,
    "deltaPnL" TEXT NOT NULL,
    "realizedPnLAfter" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "inputHash" TEXT NOT NULL,
    "calcVersion" INTEGER NOT NULL,

    CONSTRAINT "position_events_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "public"."pool_price_cache" (
    "id" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "poolAddress" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "sqrtPriceX96" TEXT NOT NULL,
    "tick" INTEGER NOT NULL,
    "blockTimestamp" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'alchemy-rpc',
    "confidence" TEXT NOT NULL DEFAULT 'exact',
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "pool_price_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."position_pnl_cache" (
    "id" TEXT NOT NULL,
    "positionUserId" TEXT NOT NULL,
    "positionChain" TEXT NOT NULL,
    "positionProtocol" TEXT NOT NULL,
    "positionNftId" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "public"."position_curve_cache" (
    "id" TEXT NOT NULL,
    "positionUserId" TEXT NOT NULL,
    "positionChain" TEXT NOT NULL,
    "positionProtocol" TEXT NOT NULL,
    "positionNftId" TEXT NOT NULL,
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
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "public"."accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "public"."sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_address_key" ON "public"."users"("address");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_token_key" ON "public"."verificationtokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_identifier_token_key" ON "public"."verificationtokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "api_keys_userId_idx" ON "public"."api_keys"("userId");

-- CreateIndex
CREATE INDEX "api_keys_prefix_idx" ON "public"."api_keys"("prefix");

-- CreateIndex
CREATE INDEX "tokens_chain_symbol_idx" ON "public"."tokens"("chain", "symbol");

-- CreateIndex
CREATE INDEX "tokens_verified_source_idx" ON "public"."tokens"("verified", "source");

-- CreateIndex
CREATE INDEX "tokens_chain_marketCap_idx" ON "public"."tokens"("chain", "marketCap" DESC);

-- CreateIndex
CREATE INDEX "pools_chain_protocol_token0Address_token1Address_idx" ON "public"."pools"("chain", "protocol", "token0Address", "token1Address");

-- CreateIndex
CREATE INDEX "pools_protocol_idx" ON "public"."pools"("protocol");

-- CreateIndex
CREATE UNIQUE INDEX "pools_chain_protocol_token0Address_token1Address_fee_key" ON "public"."pools"("chain", "protocol", "token0Address", "token1Address", "fee");

-- CreateIndex
CREATE INDEX "positions_userId_status_idx" ON "public"."positions"("userId", "status");

-- CreateIndex
CREATE INDEX "positions_owner_idx" ON "public"."positions"("owner");

-- CreateIndex
CREATE INDEX "positions_chain_poolAddress_idx" ON "public"."positions"("chain", "poolAddress");

-- CreateIndex
CREATE INDEX "position_events_positionUserId_positionChain_positionProtoc_idx" ON "public"."position_events"("positionUserId", "positionChain", "positionProtocol", "positionNftId", "blockNumber", "transactionIndex", "logIndex");

-- CreateIndex
CREATE UNIQUE INDEX "position_events_transactionHash_logIndex_positionUserId_pos_key" ON "public"."position_events"("transactionHash", "logIndex", "positionUserId", "positionChain", "positionProtocol", "positionNftId");

-- CreateIndex
CREATE UNIQUE INDEX "position_events_inputHash_key" ON "public"."position_events"("inputHash");

-- CreateIndex
CREATE UNIQUE INDEX "position_event_apr_eventId_key" ON "public"."position_event_apr"("eventId");

-- CreateIndex
CREATE INDEX "position_event_apr_eventId_isValid_idx" ON "public"."position_event_apr"("eventId", "isValid");

-- CreateIndex
CREATE INDEX "pool_price_cache_chain_poolAddress_idx" ON "public"."pool_price_cache"("chain", "poolAddress");

-- CreateIndex
CREATE INDEX "pool_price_cache_expiresAt_idx" ON "public"."pool_price_cache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "pool_price_cache_chain_poolAddress_blockNumber_key" ON "public"."pool_price_cache"("chain", "poolAddress", "blockNumber");

-- CreateIndex
CREATE INDEX "position_pnl_cache_positionUserId_positionChain_positionPro_idx" ON "public"."position_pnl_cache"("positionUserId", "positionChain", "positionProtocol", "positionNftId", "isValid");

-- CreateIndex
CREATE INDEX "position_pnl_cache_calculatedAt_idx" ON "public"."position_pnl_cache"("calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "position_pnl_cache_positionUserId_positionChain_positionPro_key" ON "public"."position_pnl_cache"("positionUserId", "positionChain", "positionProtocol", "positionNftId");

-- CreateIndex
CREATE INDEX "position_curve_cache_positionUserId_positionChain_positionP_idx" ON "public"."position_curve_cache"("positionUserId", "positionChain", "positionProtocol", "positionNftId", "isValid");

-- CreateIndex
CREATE INDEX "position_curve_cache_calculatedAt_idx" ON "public"."position_curve_cache"("calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "position_curve_cache_positionUserId_positionChain_positionP_key" ON "public"."position_curve_cache"("positionUserId", "positionChain", "positionProtocol", "positionNftId");

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pools" ADD CONSTRAINT "pools_chain_token0Address_fkey" FOREIGN KEY ("chain", "token0Address") REFERENCES "public"."tokens"("chain", "address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pools" ADD CONSTRAINT "pools_chain_token1Address_fkey" FOREIGN KEY ("chain", "token1Address") REFERENCES "public"."tokens"("chain", "address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."positions" ADD CONSTRAINT "positions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."positions" ADD CONSTRAINT "positions_chain_poolAddress_fkey" FOREIGN KEY ("chain", "poolAddress") REFERENCES "public"."pools"("chain", "poolAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."position_events" ADD CONSTRAINT "position_events_positionUserId_positionChain_positionProto_fkey" FOREIGN KEY ("positionUserId", "positionChain", "positionProtocol", "positionNftId") REFERENCES "public"."positions"("userId", "chain", "protocol", "nftId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."position_event_apr" ADD CONSTRAINT "position_event_apr_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."position_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."position_pnl_cache" ADD CONSTRAINT "position_pnl_cache_positionUserId_positionChain_positionPr_fkey" FOREIGN KEY ("positionUserId", "positionChain", "positionProtocol", "positionNftId") REFERENCES "public"."positions"("userId", "chain", "protocol", "nftId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."position_curve_cache" ADD CONSTRAINT "position_curve_cache_positionUserId_positionChain_position_fkey" FOREIGN KEY ("positionUserId", "positionChain", "positionProtocol", "positionNftId") REFERENCES "public"."positions"("userId", "chain", "protocol", "nftId") ON DELETE CASCADE ON UPDATE CASCADE;
