import { TokenReference } from '@prisma/client';
import { mockTokens } from './tokens';

/**
 * Mock TokenReference Data for testing
 * These represent polymorphic references to both global and user tokens
 */

export const mockTokenReferences = {
  WETH_ETHEREUM: {
    id: 'tokenref_weth_ethereum',
    tokenType: 'global',
    globalTokenId: 'token_weth_ethereum',
    userTokenId: null,
    chain: 'ethereum',
    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    symbol: 'WETH',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  } as TokenReference,

  USDC_ETHEREUM: {
    id: 'tokenref_usdc_ethereum',
    tokenType: 'global',
    globalTokenId: 'token_usdc_ethereum',
    userTokenId: null,
    chain: 'ethereum',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    symbol: 'USDC',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  } as TokenReference,

  // User token reference example
  CUSTOM_TOKEN_USER1: {
    id: 'tokenref_custom_user1',
    tokenType: 'user',
    globalTokenId: null,
    userTokenId: 'usertoken_custom_user1',
    chain: 'ethereum',
    address: '0x1234567890123456789012345678901234567890',
    symbol: 'CUSTOM',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  } as TokenReference,
} as const;

/**
 * Mock TokenReference with included token data for complex queries
 */
export const mockTokenReferencesWithTokens = {
  WETH_ETHEREUM: {
    ...mockTokenReferences.WETH_ETHEREUM,
    globalToken: mockTokens.WETH_ETHEREUM,
    userToken: null,
  },

  USDC_ETHEREUM: {
    ...mockTokenReferences.USDC_ETHEREUM,
    globalToken: mockTokens.USDC_ETHEREUM,
    userToken: null,
  },

  CUSTOM_TOKEN_USER1: {
    ...mockTokenReferences.CUSTOM_TOKEN_USER1,
    globalToken: null,
    userToken: {
      id: 'usertoken_custom_user1',
      userId: 'test-user-1',
      chain: 'ethereum',
      address: '0x1234567890123456789012345678901234567890',
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
} as const;