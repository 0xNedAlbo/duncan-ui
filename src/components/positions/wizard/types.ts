import type { SupportedChainsType } from "@/config/chains";
import type { Token } from "@prisma/client";
import type { PoolWithTokens } from "@/services/pools/poolService";

export interface TokenPair {
    baseToken: Token;
    quoteToken: Token;
    isValidPair: boolean;
}

export interface PoolOption {
    pool: PoolWithTokens;
    fee: number;
    feePercentage: string;
    tickSpacing: number;
    liquidity: bigint;
    volume24h?: bigint;
    tvl?: bigint;
}

export interface PositionConfig {
    lowerPrice: bigint;
    upperPrice: bigint;
    liquidityAmount: bigint;
    baseTokenAmount: bigint;
    quoteTokenAmount: bigint;
    expectedFees: bigint;
}

export interface WizardState {
    currentStep: number;
    selectedChain: SupportedChainsType | null;
    selectedTokenPair: TokenPair | null;
    selectedPool: PoolOption | null;
    positionConfig: PositionConfig | null;
}

// eslint-disable-next-line no-unused-vars
export enum WizardStep {
    CHAIN_SELECTION = 0,
    TOKEN_PAIR = 1,
    POOL_SELECTION = 2,
    POSITION_CONFIG = 3,
}

export const TOTAL_STEPS = 4;