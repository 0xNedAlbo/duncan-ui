import type { ParsedNFTPosition } from '@/services/uniswap/nftPosition';
import { TOKEN_ADDRESSES } from './tokens';

// Mock NFT positions for testing
export const mockNFTPositions: Record<string, ParsedNFTPosition> = {
  // Active WETH/USDC position on Ethereum
  ACTIVE_WETH_USDC_ETHEREUM: {
    nftId: '12345',
    chainId: 1,
    chainName: 'ethereum',
    token0Address: TOKEN_ADDRESSES.ethereum.USDC,
    token1Address: TOKEN_ADDRESSES.ethereum.WETH,
    fee: 3000, // 0.3%
    tickLower: -276325, // ~$1800
    tickUpper: -276275, // ~$1900
    liquidity: '1000000000000000000', // 1 ETH equivalent
    tokensOwed0: '100000000', // 100 USDC
    tokensOwed1: '50000000000000000', // 0.05 ETH
    isActive: true,
  },

  // Inactive position with no liquidity
  INACTIVE_POSITION_ETHEREUM: {
    nftId: '67890',
    chainId: 1,
    chainName: 'ethereum',
    token0Address: TOKEN_ADDRESSES.ethereum.USDC,
    token1Address: TOKEN_ADDRESSES.ethereum.WETH,
    fee: 500, // 0.05%
    tickLower: -276400,
    tickUpper: -276200,
    liquidity: '0', // No liquidity = inactive
    tokensOwed0: '0',
    tokensOwed1: '0',
    isActive: false,
  },

  // Active position on Arbitrum
  ACTIVE_POSITION_ARBITRUM: {
    nftId: '54321',
    chainId: 42161,
    chainName: 'arbitrum',
    token0Address: TOKEN_ADDRESSES.arbitrum.WETH, // WETH (lower address)
    token1Address: TOKEN_ADDRESSES.arbitrum.USDC, // USDC (higher address)
    fee: 3000,
    tickLower: -276300,
    tickUpper: -276250,
    liquidity: '2000000000000000000',
    tokensOwed0: '100000000000000000', // WETH amount
    tokensOwed1: '200000000', // USDC amount
    isActive: true,
  },

  // Active position on Base
  ACTIVE_POSITION_BASE: {
    nftId: '98765',
    chainId: 8453,
    chainName: 'base',
    token0Address: TOKEN_ADDRESSES.base.USDC,
    token1Address: TOKEN_ADDRESSES.base.WETH,
    fee: 3000,
    tickLower: -276320,
    tickUpper: -276280,
    liquidity: '500000000000000000',
    tokensOwed0: '50000000',
    tokensOwed1: '25000000000000000',
    isActive: true,
  },
};

// Mock viem contract return data that corresponds to the parsed positions
export const mockViemContractData = {
  [mockNFTPositions.ACTIVE_WETH_USDC_ETHEREUM.nftId]: [
    BigInt(1), // nonce
    '0x0000000000000000000000000000000000000000', // operator
    TOKEN_ADDRESSES.ethereum.USDC, // token0
    TOKEN_ADDRESSES.ethereum.WETH, // token1
    3000, // fee
    -276325, // tickLower
    -276275, // tickUpper
    BigInt('1000000000000000000'), // liquidity
    BigInt(0), // feeGrowthInside0LastX128
    BigInt(0), // feeGrowthInside1LastX128
    BigInt('100000000'), // tokensOwed0
    BigInt('50000000000000000'), // tokensOwed1
  ] as const,

  [mockNFTPositions.INACTIVE_POSITION_ETHEREUM.nftId]: [
    BigInt(2),
    '0x0000000000000000000000000000000000000000',
    TOKEN_ADDRESSES.ethereum.USDC,
    TOKEN_ADDRESSES.ethereum.WETH,
    500,
    -276400,
    -276200,
    BigInt(0), // No liquidity
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
  ] as const,

  [mockNFTPositions.ACTIVE_POSITION_ARBITRUM.nftId]: [
    BigInt(3),
    '0x0000000000000000000000000000000000000000',
    TOKEN_ADDRESSES.arbitrum.WETH,
    TOKEN_ADDRESSES.arbitrum.USDC,
    3000,
    -276300,
    -276250,
    BigInt('2000000000000000000'),
    BigInt(0),
    BigInt(0),
    BigInt('100000000000000000'),
    BigInt('200000000'),
  ] as const,

  [mockNFTPositions.ACTIVE_POSITION_BASE.nftId]: [
    BigInt(4),
    '0x0000000000000000000000000000000000000000',
    TOKEN_ADDRESSES.base.USDC,
    TOKEN_ADDRESSES.base.WETH,
    3000,
    -276320,
    -276280,
    BigInt('500000000000000000'),
    BigInt(0),
    BigInt(0),
    BigInt('50000000'),
    BigInt('25000000000000000'),
  ] as const,
};

// Invalid NFT IDs for testing error cases
export const INVALID_NFT_IDS = [
  '99999999', // Non-existent NFT
  '0', // Edge case
  '', // Empty string
  'invalid', // Non-numeric
];

// Supported chains for testing
export const SUPPORTED_CHAINS = ['ethereum', 'arbitrum', 'base'];
export const UNSUPPORTED_CHAINS = ['polygon', 'optimism', 'bsc'];