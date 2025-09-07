import { Pool, UserToken } from '@prisma/client';
import { mockTokens } from './tokens';
import { mockTokenReferences } from './tokenReferences';

/**
 * Mock Pool Data for testing
 */

export const mockPools = {
  WETH_USDC_3000: {
    id: 'pool_weth_usdc_3000',
    chain: 'ethereum',
    poolAddress: '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8',
    token0RefId: 'tokenref_weth_ethereum',
    token1RefId: 'tokenref_usdc_ethereum',
    token0Id: 'token_weth_ethereum',  // Legacy field for compatibility
    token1Id: 'token_usdc_ethereum', // Legacy field for compatibility
    token0Address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    token1Address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    fee: 3000,
    tickSpacing: 60,
    currentTick: 202500,
    currentPrice: '1650.25',
    sqrtPriceX96: '3543191142285914205922034323214',
    tvl: '156789123.45',
    volume24h: '25678912.34',
    apr: 12.5,
    ownerId: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  } as Pool,

  WETH_USDC_500: {
    id: 'pool_weth_usdc_500',
    chain: 'ethereum',
    poolAddress: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    token0RefId: 'tokenref_weth_ethereum',
    token1RefId: 'tokenref_usdc_ethereum',
    token0Id: 'token_weth_ethereum',  // Legacy field for compatibility
    token1Id: 'token_usdc_ethereum', // Legacy field for compatibility
    token0Address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    token1Address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    fee: 500,
    tickSpacing: 10,
    currentTick: 202450,
    currentPrice: '1648.75',
    sqrtPriceX96: '3542191142285914205922034323214',
    tvl: '89234567.89',
    volume24h: '45123456.78',
    apr: 8.3,
    ownerId: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  } as Pool,

  // Custom Pool with UserTokens
  CUSTOM_TOKEN_POOL: {
    id: 'pool_custom_test',
    chain: 'ethereum',
    poolAddress: '0x1234567890123456789012345678901234567890',
    token0RefId: 'tokenref_custom_user1',
    token1RefId: 'tokenref_usdc_ethereum',
    token0Id: null,  // Legacy field - no global token
    token1Id: 'token_usdc_ethereum',  // Legacy field - global USDC
    token0Address: '0x0123456789012345678901234567890123456789', // Custom token
    token1Address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
    fee: 3000,
    tickSpacing: 60,
    currentTick: null,
    currentPrice: null,
    sqrtPriceX96: null,
    tvl: null,
    volume24h: null,
    apr: null,
    ownerId: 'user_test_1',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  } as Pool,
} as const;

/**
 * Mock Pools with included TokenReference data for complex queries
 */
export const mockPoolsWithTokenReferences = {
  WETH_USDC_3000: {
    ...mockPools.WETH_USDC_3000,
    token0Ref: {
      ...mockTokenReferences.WETH_ETHEREUM,
      globalToken: mockTokens.WETH_ETHEREUM,
      userToken: null,
    },
    token1Ref: {
      ...mockTokenReferences.USDC_ETHEREUM,
      globalToken: mockTokens.USDC_ETHEREUM,
      userToken: null,
    },
  },

  CUSTOM_TOKEN_POOL: {
    ...mockPools.CUSTOM_TOKEN_POOL,
    token0Ref: {
      ...mockTokenReferences.CUSTOM_TOKEN_USER1,
      globalToken: null,
      userToken: {
        id: 'usertoken_custom_user1',
        userId: 'test-user-1',
        chain: 'ethereum',
        address: '0x0123456789012345678901234567890123456789',
        symbol: 'CUSTOM',
        name: 'Custom Test Token',
        decimals: 18,
        logoUrl: null,
        source: 'manual',
        addedAt: new Date('2024-01-01T00:00:00Z'),
        lastUsedAt: new Date('2024-01-01T00:00:00Z'),
        userLabel: 'My Custom Token',
        notes: 'Test token for unit tests',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      },
    },
    token1Ref: {
      ...mockTokenReferences.USDC_ETHEREUM,
      globalToken: mockTokens.USDC_ETHEREUM,
      userToken: null,
    },
  },
} as const;

export const mockUserTokens = {
  CUSTOM_TOKEN: {
    id: 'usertoken_custom_1',
    userId: 'user_test_1',
    chain: 'ethereum',
    address: '0x0123456789012345678901234567890123456789',
    symbol: 'CUSTOM',
    name: 'Custom Test Token',
    decimals: 18,
    logoUrl: null,
    source: 'contract',
    addedAt: new Date('2024-01-01T00:00:00Z'),
    lastUsedAt: new Date('2024-01-01T00:00:00Z'),
    userLabel: 'My Test Token',
    notes: 'Added for testing purposes',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  } as UserToken,

  PLACEHOLDER_TOKEN: {
    id: 'usertoken_placeholder_1',
    userId: 'user_test_1', 
    chain: 'ethereum',
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    symbol: '0xabcd...abcd',
    name: 'Unknown Token (0xabcd...abcd)',
    decimals: 18,
    logoUrl: null,
    source: 'placeholder',
    addedAt: new Date('2024-01-01T00:00:00Z'),
    lastUsedAt: new Date('2024-01-01T00:00:00Z'),
    userLabel: null,
    notes: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  } as UserToken,
};

export const mockPoolState = {
  WETH_USDC: {
    sqrtPriceX96: BigInt('3543191142285914205922034323214'),
    tick: 202500,
    liquidity: BigInt('12345678901234567890'),
    token0: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    token1: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    fee: 3000,
    tickSpacing: 60,
  },
};

export const mockFactoryResponses = {
  WETH_USDC_3000: '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8',
  WETH_USDC_500: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
  NON_EXISTENT: '0x0000000000000000000000000000000000000000',
};