import type { AlchemyTokenMetadata } from '@/services/alchemy/tokenMetadata';

// Well-known token addresses for testing
export const TOKEN_ADDRESSES = {
  ethereum: {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  },
  arbitrum: {
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  },
  base: {
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
};

// Mock Alchemy responses
export const mockAlchemyResponses: Record<string, AlchemyTokenMetadata> = {
  [TOKEN_ADDRESSES.ethereum.WETH]: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logo: 'https://static.alchemyapi.io/images/assets/2396.png',
  },
  [TOKEN_ADDRESSES.ethereum.USDC]: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logo: 'https://static.alchemyapi.io/images/assets/3408.png',
  },
  [TOKEN_ADDRESSES.ethereum.USDT]: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logo: 'https://static.alchemyapi.io/images/assets/825.png',
  },
  [TOKEN_ADDRESSES.ethereum.DAI]: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logo: 'https://static.alchemyapi.io/images/assets/1027.png',
  },
  [TOKEN_ADDRESSES.arbitrum.WETH]: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logo: 'https://static.alchemyapi.io/images/assets/2396.png',
  },
  [TOKEN_ADDRESSES.arbitrum.USDC]: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logo: 'https://static.alchemyapi.io/images/assets/3408.png',
  },
  [TOKEN_ADDRESSES.base.WETH]: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logo: 'https://static.alchemyapi.io/images/assets/2396.png',
  },
  [TOKEN_ADDRESSES.base.USDC]: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logo: 'https://static.alchemyapi.io/images/assets/3408.png',
  },
};

// Mock token for database tests
export const mockTokens = {
  WETH_ETHEREUM: {
    id: 'clvyxz9p10000pz8yhcz9mf23',
    chain: 'ethereum',
    address: TOKEN_ADDRESSES.ethereum.WETH,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoUrl: 'https://static.alchemyapi.io/images/assets/2396.png',
    verified: true,
    lastUpdatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  USDC_ETHEREUM: {
    id: 'clvyxz9p10001pz8yhcz9mf24',
    chain: 'ethereum',
    address: TOKEN_ADDRESSES.ethereum.USDC,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoUrl: 'https://static.alchemyapi.io/images/assets/3408.png',
    verified: true,
    lastUpdatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

// Invalid addresses for testing
export const INVALID_ADDRESSES = [
  '',
  '0x123',
  '0xInvalidAddress',
  'not-an-address',
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756C', // Too short
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc22', // Too long
];