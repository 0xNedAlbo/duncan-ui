/**
 * Chain-specific configuration for blockchain mocks
 * Contains addresses, tokens, pools, and other chain-specific data
 */

import { mainnet, arbitrum, base } from 'viem/chains';

/**
 * Interface for token configuration
 */
export interface MockTokenConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply?: string;
}

/**
 * Interface for pool configuration
 */
export interface MockPoolConfig {
  address: string;
  token0: string;
  token1: string;
  fee: number;
  tickSpacing: number;
  sqrtPriceX96: string;
  tick: number;
  liquidity: string;
  observationIndex: number;
  observationCardinality: number;
  observationCardinalityNext: number;
  feeProtocol: number;
  unlocked: boolean;
}

/**
 * Interface for contract addresses
 */
export interface MockContractConfig {
  uniswapV3Factory: string;
  nftPositionManager: string;
  quoterV2: string;
  factoryOwner: string;
}

/**
 * Interface for test wallet configuration
 */
export interface MockWalletConfig {
  address: string;
  balance: string; // ETH balance in wei
  tokenBalance: string; // Generic token balance for tests
}

/**
 * Interface for chain configuration
 */
export interface MockChainConfig {
  viemChain: any;
  chainId: number;
  name: string;
  mockBlockNumber: number;
  contracts: MockContractConfig;
  testWallet: MockWalletConfig;
  tokens: MockTokenConfig[];
  pools: MockPoolConfig[];
}

/**
 * Ethereum mainnet configuration
 */
const ethereumConfig: MockChainConfig = {
  viemChain: mainnet,
  chainId: 1,
  name: 'ethereum',
  mockBlockNumber: 18000000,
  
  contracts: {
    uniswapV3Factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    nftPositionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    factoryOwner: '0x1a9C8182C09F50C8318d769245beA52c32BE35BC',
  },

  testWallet: {
    address: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', // Hardhat test account #1
    balance: '10000000000000000000', // 10 ETH
    tokenBalance: '1000000000000000000000', // 1000 tokens (18 decimals)
  },

  tokens: [
    {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      totalSupply: '7000000000000000000000000', // ~7M WETH
    },
    {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      totalSupply: '50000000000000000', // 50B USDC (6 decimals)
    },
    {
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      totalSupply: '5000000000000000000000000000', // 5B DAI
    },
    {
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      symbol: 'WBTC',
      name: 'Wrapped BTC',
      decimals: 8,
      totalSupply: '21000000000000', // 210K WBTC (8 decimals)
    },
  ],

  pools: [
    {
      address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
      token0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC (lower address)
      token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      fee: 500,
      tickSpacing: 10,
      sqrtPriceX96: '1392486909633467119786647344', // ~$2000 ETH/USD
      tick: 202458,
      liquidity: '15000000000000000000000',
      observationIndex: 1,
      observationCardinality: 1,
      observationCardinalityNext: 1,
      feeProtocol: 0,
      unlocked: true,
    },
    {
      address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
      token0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      fee: 3000,
      tickSpacing: 60,
      sqrtPriceX96: '1392486909633467119786647344',
      tick: 202458,
      liquidity: '25000000000000000000000',
      observationIndex: 1,
      observationCardinality: 1,
      observationCardinalityNext: 1,
      feeProtocol: 0,
      unlocked: true,
    },
    {
      address: '0x4585FE77225b41b697C938B018E2Ac67Ac5a20c0',
      token0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      fee: 10000,
      tickSpacing: 200,
      sqrtPriceX96: '1392486909633467119786647344',
      tick: 202458,
      liquidity: '8000000000000000000000',
      observationIndex: 1,
      observationCardinality: 1,
      observationCardinalityNext: 1,
      feeProtocol: 0,
      unlocked: true,
    },
  ],
};

/**
 * Arbitrum configuration
 */
const arbitrumConfig: MockChainConfig = {
  viemChain: arbitrum,
  chainId: 42161,
  name: 'arbitrum',
  mockBlockNumber: 150000000,

  contracts: {
    uniswapV3Factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    nftPositionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    factoryOwner: '0x1a9C8182C09F50C8318d769245beA52c32BE35BC',
  },

  testWallet: {
    address: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    balance: '10000000000000000000', // 10 ETH
    tokenBalance: '1000000000000000000000', // 1000 tokens
  },

  tokens: [
    {
      address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      totalSupply: '1000000000000000000000000',
    },
    {
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      totalSupply: '10000000000000000',
    },
    {
      address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      totalSupply: '1000000000000000000000000000',
    },
  ],

  pools: [
    {
      address: '0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443',
      token0: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
      token1: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
      fee: 500,
      tickSpacing: 10,
      sqrtPriceX96: '1392486909633467119786647344',
      tick: 202458,
      liquidity: '8000000000000000000000',
      observationIndex: 1,
      observationCardinality: 1,
      observationCardinalityNext: 1,
      feeProtocol: 0,
      unlocked: true,
    },
    {
      address: '0x17c14D2c404D167802b16C450d3c99F88F2c4F4d',
      token0: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
      token1: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
      fee: 3000,
      tickSpacing: 60,
      sqrtPriceX96: '1392486909633467119786647344',
      tick: 202458,
      liquidity: '12000000000000000000000',
      observationIndex: 1,
      observationCardinality: 1,
      observationCardinalityNext: 1,
      feeProtocol: 0,
      unlocked: true,
    },
  ],
};

/**
 * Base configuration
 */
const baseConfig: MockChainConfig = {
  viemChain: base,
  chainId: 8453,
  name: 'base',
  mockBlockNumber: 5000000,

  contracts: {
    uniswapV3Factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    nftPositionManager: '0x03a520b32C04BF3bEEf7BF5d2d9B1EE2ECf0aDc1',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    factoryOwner: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  },

  testWallet: {
    address: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    balance: '10000000000000000000', // 10 ETH
    tokenBalance: '1000000000000000000000', // 1000 tokens
  },

  tokens: [
    {
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      totalSupply: '500000000000000000000000',
    },
    {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      totalSupply: '5000000000000000',
    },
  ],

  pools: [
    {
      address: '0xd0b53D9277642d899DF5C87A3966A349A798F224',
      token0: '0x4200000000000000000000000000000000000006', // WETH
      token1: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
      fee: 500,
      tickSpacing: 10,
      sqrtPriceX96: '1392486909633467119786647344',
      tick: 202458,
      liquidity: '3000000000000000000000',
      observationIndex: 1,
      observationCardinality: 1,
      observationCardinalityNext: 1,
      feeProtocol: 0,
      unlocked: true,
    },
    {
      address: '0x4C36388bE6F416A29C8d8Eee81C771cE6bE14B18',
      token0: '0x4200000000000000000000000000000000000006', // WETH
      token1: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
      fee: 3000,
      tickSpacing: 60,
      sqrtPriceX96: '1392486909633467119786647344',
      tick: 202458,
      liquidity: '5000000000000000000000',
      observationIndex: 1,
      observationCardinality: 1,
      observationCardinalityNext: 1,
      feeProtocol: 0,
      unlocked: true,
    },
  ],
};

/**
 * Combined chain configurations export
 */
export const chainConfigs = {
  ethereum: ethereumConfig,
  arbitrum: arbitrumConfig,
  base: baseConfig,
} as const;

/**
 * Helper functions
 */
export function getTokenBySymbol(chain: keyof typeof chainConfigs, symbol: string): MockTokenConfig | undefined {
  return chainConfigs[chain].tokens.find(token => token.symbol === symbol);
}

export function getPoolByTokens(
  chain: keyof typeof chainConfigs, 
  token0: string, 
  token1: string, 
  fee: number
): MockPoolConfig | undefined {
  return chainConfigs[chain].pools.find(pool => {
    const addr0 = token0.toLowerCase();
    const addr1 = token1.toLowerCase();
    const poolToken0 = pool.token0.toLowerCase();
    const poolToken1 = pool.token1.toLowerCase();
    
    return (
      (poolToken0 === addr0 && poolToken1 === addr1 && pool.fee === fee) ||
      (poolToken0 === addr1 && poolToken1 === addr0 && pool.fee === fee)
    );
  });
}

export function getAllSupportedChains(): Array<keyof typeof chainConfigs> {
  return ['ethereum', 'arbitrum', 'base'];
}