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
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
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
CREATE TABLE "public"."tokens" (
    "id" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "logoUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "logoUrl" TEXT,
    "source" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL,
    "userLabel" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."token_references" (
    "id" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "globalTokenId" TEXT,
    "userTokenId" TEXT,
    "chain" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pools" (
    "id" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "poolAddress" TEXT NOT NULL,
    "token0RefId" TEXT NOT NULL,
    "token1RefId" TEXT NOT NULL,
    "token0Address" TEXT NOT NULL,
    "token1Address" TEXT NOT NULL,
    "fee" INTEGER NOT NULL,
    "tickSpacing" INTEGER NOT NULL,
    "currentTick" INTEGER,
    "currentPrice" TEXT,
    "sqrtPriceX96" TEXT,
    "tvl" TEXT,
    "volume24h" TEXT,
    "apr" DOUBLE PRECISION,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."positions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "tickLower" INTEGER NOT NULL,
    "tickUpper" INTEGER NOT NULL,
    "liquidity" TEXT NOT NULL,
    "token0IsQuote" BOOLEAN NOT NULL,
    "owner" TEXT,
    "importType" TEXT NOT NULL,
    "nftId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "initialValue" TEXT,
    "initialToken0Amount" TEXT,
    "initialToken1Amount" TEXT,
    "initialTimestamp" TIMESTAMP(3),
    "initialSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "public"."accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "public"."sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_token_key" ON "public"."verificationtokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_identifier_token_key" ON "public"."verificationtokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "tokens_chain_symbol_idx" ON "public"."tokens"("chain", "symbol");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_chain_address_key" ON "public"."tokens"("chain", "address");

-- CreateIndex
CREATE INDEX "user_tokens_userId_chain_idx" ON "public"."user_tokens"("userId", "chain");

-- CreateIndex
CREATE INDEX "user_tokens_userId_symbol_idx" ON "public"."user_tokens"("userId", "symbol");

-- CreateIndex
CREATE UNIQUE INDEX "user_tokens_userId_chain_address_key" ON "public"."user_tokens"("userId", "chain", "address");

-- CreateIndex
CREATE INDEX "token_references_chain_address_idx" ON "public"."token_references"("chain", "address");

-- CreateIndex
CREATE INDEX "token_references_tokenType_idx" ON "public"."token_references"("tokenType");

-- CreateIndex
CREATE INDEX "token_references_symbol_idx" ON "public"."token_references"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "token_references_tokenType_globalTokenId_key" ON "public"."token_references"("tokenType", "globalTokenId");

-- CreateIndex
CREATE UNIQUE INDEX "token_references_tokenType_userTokenId_key" ON "public"."token_references"("tokenType", "userTokenId");

-- CreateIndex
CREATE UNIQUE INDEX "token_references_chain_address_tokenType_globalTokenId_key" ON "public"."token_references"("chain", "address", "tokenType", "globalTokenId");

-- CreateIndex
CREATE UNIQUE INDEX "token_references_chain_address_tokenType_userTokenId_key" ON "public"."token_references"("chain", "address", "tokenType", "userTokenId");

-- CreateIndex
CREATE INDEX "pools_chain_token0Address_token1Address_idx" ON "public"."pools"("chain", "token0Address", "token1Address");

-- CreateIndex
CREATE INDEX "pools_ownerId_idx" ON "public"."pools"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "pools_chain_poolAddress_key" ON "public"."pools"("chain", "poolAddress");

-- CreateIndex
CREATE UNIQUE INDEX "pools_chain_token0Address_token1Address_fee_key" ON "public"."pools"("chain", "token0Address", "token1Address", "fee");

-- CreateIndex
CREATE INDEX "positions_userId_status_idx" ON "public"."positions"("userId", "status");

-- CreateIndex
CREATE INDEX "positions_owner_idx" ON "public"."positions"("owner");

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_tokens" ADD CONSTRAINT "user_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."token_references" ADD CONSTRAINT "token_references_globalTokenId_fkey" FOREIGN KEY ("globalTokenId") REFERENCES "public"."tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."token_references" ADD CONSTRAINT "token_references_userTokenId_fkey" FOREIGN KEY ("userTokenId") REFERENCES "public"."user_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pools" ADD CONSTRAINT "pools_token0RefId_fkey" FOREIGN KEY ("token0RefId") REFERENCES "public"."token_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pools" ADD CONSTRAINT "pools_token1RefId_fkey" FOREIGN KEY ("token1RefId") REFERENCES "public"."token_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pools" ADD CONSTRAINT "pools_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."positions" ADD CONSTRAINT "positions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."positions" ADD CONSTRAINT "positions_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "public"."pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
