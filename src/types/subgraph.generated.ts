// Generated TypeScript types from Official Uniswap V3 Subgraph Schema
// This file is auto-generated. Do not edit manually.

// Scalar types as used by The Graph Protocol
export type BigDecimal = string;
export type BigInt = string;
export type Bytes = string;

// Core Entity Types

export interface Factory {
  id: string;
  poolCount: BigInt;
  txCount: BigInt;
  totalVolumeUSD: BigDecimal;
  totalVolumeETH: BigDecimal;
  totalFeesUSD: BigDecimal;
  totalFeesETH: BigDecimal;
  untrackedVolumeUSD: BigDecimal;
  totalValueLockedUSD: BigDecimal;
  totalValueLockedETH: BigDecimal;
  totalValueLockedUSDUntracked: BigDecimal;
  totalValueLockedETHUntracked: BigDecimal;
  owner: string;
}

export interface Bundle {
  id: string;
  ethPriceUSD: BigDecimal;
}

export interface Token {
  id: Bytes;
  symbol: string;
  name: string;
  decimals: BigInt;
  totalSupply: BigInt;
  volume: BigDecimal;
  volumeUSD: BigDecimal;
  untrackedVolumeUSD: BigDecimal;
  feesUSD: BigDecimal;
  txCount: BigInt;
  poolCount: BigInt;
  totalValueLocked: BigDecimal;
  totalValueLockedUSD: BigDecimal;
  totalValueLockedUSDUntracked: BigDecimal;
  derivedETH: BigDecimal;
  whitelistPools: Pool[];
  tokenDayData: TokenDayData[];
}

export interface Pool {
  id: Bytes;
  createdAtTimestamp: BigInt;
  createdAtBlockNumber: BigInt;
  token0: Token;
  token1: Token;
  feeTier: BigInt;
  liquidity: BigInt;
  sqrtPrice: BigInt;
  token0Price: BigDecimal;
  token1Price: BigDecimal;
  tick?: BigInt;
  observationIndex: BigInt;
  volumeToken0: BigDecimal;
  volumeToken1: BigDecimal;
  volumeUSD: BigDecimal;
  untrackedVolumeUSD: BigDecimal;
  feesUSD: BigDecimal;
  txCount: BigInt;
  collectedFeesToken0: BigDecimal;
  collectedFeesToken1: BigDecimal;
  collectedFeesUSD: BigDecimal;
  totalValueLockedToken0: BigDecimal;
  totalValueLockedToken1: BigDecimal;
  totalValueLockedETH: BigDecimal;
  totalValueLockedUSD: BigDecimal;
  totalValueLockedUSDUntracked: BigDecimal;
  liquidityProviderCount: BigInt;
  poolHourData: PoolHourData[];
  poolDayData: PoolDayData[];
  mints: Mint[];
  burns: Burn[];
  swaps: Swap[];
  collects: Collect[];
  ticks: Tick[];
}

export interface Tick {
  id: string;
  poolAddress: Bytes;
  tickIdx: BigInt;
  pool: Pool;
  liquidityGross: BigInt;
  liquidityNet: BigInt;
  price0: BigDecimal;
  price1: BigDecimal;
  createdAtTimestamp: BigInt;
  createdAtBlockNumber: BigInt;
}

export interface Position {
  id: string;
  owner: Bytes;
  pool: Pool;
  token0: Token;
  token1: Token;
  tickLower: Tick;
  tickUpper: Tick;
  liquidity: BigInt;
  depositedToken0: BigDecimal;
  depositedToken1: BigDecimal;
  withdrawnToken0: BigDecimal;
  withdrawnToken1: BigDecimal;
  collectedFeesToken0: BigDecimal;
  collectedFeesToken1: BigDecimal;
  transaction: Transaction;
  feeGrowthInside0LastX128: BigInt;
  feeGrowthInside1LastX128: BigInt;
}

export interface PositionSnapshot {
  id: string;
  owner: Bytes;
  pool: Pool;
  position: Position;
  blockNumber: BigInt;
  timestamp: BigInt;
  liquidity: BigInt;
  depositedToken0: BigDecimal;
  depositedToken1: BigDecimal;
  withdrawnToken0: BigDecimal;
  withdrawnToken1: BigDecimal;
  collectedFeesToken0: BigDecimal;
  collectedFeesToken1: BigDecimal;
  transaction: Transaction;
  feeGrowthInside0LastX128: BigInt;
  feeGrowthInside1LastX128: BigInt;
}

export interface Transaction {
  id: string;
  blockNumber: BigInt;
  timestamp: BigInt;
  gasUsed: BigInt;
  gasPrice: BigInt;
  mints: Mint[];
  burns: Burn[];
  swaps: Swap[];
  flashed: Flash[];
  collects: Collect[];
}

export interface Mint {
  id: string;
  transaction: Transaction;
  timestamp: BigInt;
  pool: Pool;
  token0: Token;
  token1: Token;
  owner: Bytes;
  sender?: Bytes;
  origin: Bytes;
  amount: BigInt;
  amount0: BigDecimal;
  amount1: BigDecimal;
  amountUSD?: BigDecimal;
  tickLower: BigInt;
  tickUpper: BigInt;
  logIndex?: BigInt;
}

export interface Burn {
  id: string;
  transaction: Transaction;
  pool: Pool;
  token0: Token;
  token1: Token;
  timestamp: BigInt;
  owner?: Bytes;
  origin: Bytes;
  amount: BigInt;
  amount0: BigDecimal;
  amount1: BigDecimal;
  amountUSD?: BigDecimal;
  tickLower: BigInt;
  tickUpper: BigInt;
  logIndex?: BigInt;
}

export interface Swap {
  id: string;
  transaction: Transaction;
  timestamp: BigInt;
  pool: Pool;
  token0: Token;
  token1: Token;
  sender: Bytes;
  recipient: Bytes;
  origin: Bytes;
  amount0: BigDecimal;
  amount1: BigDecimal;
  amountUSD: BigDecimal;
  sqrtPriceX96: BigInt;
  tick: BigInt;
  logIndex?: BigInt;
}

export interface Collect {
  id: string;
  transaction: Transaction;
  timestamp: BigInt;
  pool: Pool;
  owner?: Bytes;
  amount0: BigDecimal;
  amount1: BigDecimal;
  amountUSD?: BigDecimal;
  tickLower: BigInt;
  tickUpper: BigInt;
  logIndex?: BigInt;
}

export interface Flash {
  id: string;
  transaction: Transaction;
  timestamp: BigInt;
  pool: Pool;
  sender: Bytes;
  recipient: Bytes;
  amount0: BigDecimal;
  amount1: BigDecimal;
  amountUSD: BigDecimal;
  amount0Paid: BigDecimal;
  amount1Paid: BigDecimal;
  logIndex?: BigInt;
}

// Historical Data Types

export interface UniswapDayData {
  id: string;
  date: number;
  volumeETH: BigDecimal;
  volumeUSD: BigDecimal;
  volumeUSDUntracked: BigDecimal;
  feesUSD: BigDecimal;
  txCount: BigInt;
  tvlUSD: BigDecimal;
}

export interface PoolDayData {
  id: string;
  date: number;
  pool: Pool;
  liquidity: BigInt;
  sqrtPrice: BigInt;
  token0Price: BigDecimal;
  token1Price: BigDecimal;
  tick?: BigInt;
  tvlUSD: BigDecimal;
  volumeToken0: BigDecimal;
  volumeToken1: BigDecimal;
  volumeUSD: BigDecimal;
  feesUSD: BigDecimal;
  txCount: BigInt;
  open: BigDecimal;
  high: BigDecimal;
  low: BigDecimal;
  close: BigDecimal;
}

export interface PoolHourData {
  id: string;
  periodStartUnix: number;
  pool: Pool;
  liquidity: BigInt;
  sqrtPrice: BigInt;
  token0Price: BigDecimal;
  token1Price: BigDecimal;
  tick?: BigInt;
  tvlUSD: BigDecimal;
  volumeToken0: BigDecimal;
  volumeToken1: BigDecimal;
  volumeUSD: BigDecimal;
  feesUSD: BigDecimal;
  txCount: BigInt;
  open: BigDecimal;
  high: BigDecimal;
  low: BigDecimal;
  close: BigDecimal;
}

export interface TokenDayData {
  id: string;
  date: number;
  token: Token;
  volume: BigDecimal;
  volumeUSD: BigDecimal;
  untrackedVolumeUSD: BigDecimal;
  totalValueLocked: BigDecimal;
  totalValueLockedUSD: BigDecimal;
  priceUSD: BigDecimal;
  feesUSD: BigDecimal;
  open: BigDecimal;
  high: BigDecimal;
  low: BigDecimal;
  close: BigDecimal;
}

export interface TokenHourData {
  id: string;
  periodStartUnix: number;
  token: Token;
  volume: BigDecimal;
  volumeUSD: BigDecimal;
  untrackedVolumeUSD: BigDecimal;
  totalValueLocked: BigDecimal;
  totalValueLockedUSD: BigDecimal;
  priceUSD: BigDecimal;
  feesUSD: BigDecimal;
  open: BigDecimal;
  high: BigDecimal;
  low: BigDecimal;
  close: BigDecimal;
}

// GraphQL Response wrapper types
export interface SubgraphResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

// Query result types for common operations
export interface PositionQueryData {
  position: Position | null;
}

export interface PositionsQueryData {
  positions: Position[];
}

export interface PoolQueryData {
  pool: Pool | null;
}

export interface PoolsQueryData {
  pools: Pool[];
}

export interface TokenQueryData {
  token: Token | null;
}

export interface TokensQueryData {
  tokens: Token[];
}

export interface FactoryQueryData {
  factory: Factory | null;
}

export interface PoolDayDatasQueryData {
  poolDayDatas: PoolDayData[];
}