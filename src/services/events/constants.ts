/**
 * Constants for Etherscan event querying
 * Uniswap V3 NFT Position Manager events and contract addresses
 */

// Uniswap V3 NFT Position Manager contract addresses per chain
export const NFT_POSITION_MANAGER_ADDRESSES = {
  ethereum: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  arbitrum: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  base: '0x03a520b32C04BF3bEEf7BF5d7B5B2C5e4eF7B08F', // Base uses different address
} as const;

// Chain ID mapping for Etherscan API
export const CHAIN_IDS = {
  ethereum: 1,
  arbitrum: 42161,
  base: 8453,
} as const;

// Event signatures (Keccak256 hashes)
export const EVENT_SIGNATURES = {
  // IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
  INCREASE_LIQUIDITY: '0x3067048beee31b25b2f1681f88dac838c8bba36af25bfb2b7cf7473a5847e35f',
  
  // DecreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
  DECREASE_LIQUIDITY: '0x26f6a048ee9138f2c0ce266f322cb99228e8d619ae2158715741cef68e8b1573',
  
  // Collect(uint256 indexed tokenId, address recipient, uint256 amount0, uint256 amount1) - NFT Position Manager event
  COLLECT: '0x40d0efd1a53d60ecbf40971b9daf7dc90178c3aadc7aab1765632738fa8b8f01',
  
  // Transfer(address indexed from, address indexed to, uint256 indexed tokenId) - Optional for ownership tracking
  TRANSFER: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
} as const;

// Rate limiting configuration
export const RATE_LIMIT = {
  REQUESTS_PER_SECOND: 5, // Etherscan free tier limit
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

// API configuration
export const ETHERSCAN_API = {
  BASE_URL: 'https://api.etherscan.io/v2/api',
  TIMEOUT_MS: 30000,
} as const;

export type ChainSlug = keyof typeof NFT_POSITION_MANAGER_ADDRESSES;
export type EventType = keyof typeof EVENT_SIGNATURES;