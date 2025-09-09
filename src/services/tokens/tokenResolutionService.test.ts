import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { TokenResolutionService } from './tokenResolutionService';
import { mockTokens } from '../../__tests__/fixtures/tokens';
import { mockUserTokens } from '../../__tests__/fixtures/pools';
import { server } from '../../__tests__/mocks/server';
import { mockViemCalls } from '../../__tests__/mocks/poolHandlers';
import { createTestFactorySuite } from '../../__tests__/factories';

// Mock viem functions
vi.mock('viem', () => ({
  createPublicClient: vi.fn(() => ({
    readContract: vi.fn((params: any) => {
      const { functionName, address } = params;
      
      switch (functionName) {
        case 'name':
          return mockViemCalls.mockTokenName(address);
        case 'symbol':
          return mockViemCalls.mockTokenSymbol(address);
        case 'decimals':
          return mockViemCalls.mockTokenDecimals(address);
        default:
          throw new Error(`Unknown function: ${functionName}`);
      }
    }),
  })),
  http: vi.fn(),
}));

vi.mock('viem/chains', () => ({
  mainnet: { id: 1, name: 'Ethereum' },
  arbitrum: { id: 42161, name: 'Arbitrum' },
  base: { id: 8453, name: 'Base' },
}));

describe('TokenResolutionService', () => {
  let testPrisma: PrismaClient;
  let factories: ReturnType<typeof createTestFactorySuite>;
  let service: TokenResolutionService;
  let testUserId: string;

  beforeAll(async () => {
    server.listen();
    
    // Set up test database
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://duncan:dev123@localhost:5432/duncan_test'
        }
      }
    });
    
    await testPrisma.$connect();
    
    // Initialize factories
    factories = createTestFactorySuite(testPrisma);
  });

  afterAll(async () => {
    server.close();
    await factories.cleanup();
    await testPrisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await factories.cleanup();
    
    // Create test user
    const { user } = await factories.users.createUserForApiTest('test-user');
    testUserId = user.id;
    
    // Create service with test database
    service = new TokenResolutionService(testPrisma);
    
    // Seed common tokens
    await factories.tokens.createCommonTokens('ethereum');
    
    server.resetHandlers();
  });

  afterEach(async () => {
    await service.disconnect();
  });

  describe('resolveToken', () => {
    it('should return global token if verified', async () => {
      const result = await service.resolveToken(
        'ethereum',
        mockTokens.WETH_ETHEREUM.address,
        testUserId
      );

      expect(result.isGlobal).toBe(true);
      expect(result.isVerified).toBe(true);
      expect(result.symbol).toBe('WETH');
      expect(result.source).toBe('alchemy');
    });

    it('should return user token if exists in custom list', async () => {
      // Add custom token using factory
      const customToken = await factories.tokens.createTokenForUser(
        testUserId,
        {
          id: 'custom-token-1',
          chain: 'ethereum',
          address: '0x0123456789012345678901234567890123456789',
          symbol: 'CUSTOM',
          name: 'Custom Token',
          decimals: 18,
          verified: false
        },
        {
          userLabel: 'My Test Token',
          source: 'manual'
        }
      );

      const result = await service.resolveToken(
        'ethereum',
        customToken.address,
        testUserId
      );

      expect(result.isGlobal).toBe(false);
      expect(result.isVerified).toBe(false);
      expect(result.symbol).toBe('CUSTOM');
      expect(result.userLabel).toBe('My Test Token');
    });

    it('should create new token from Alchemy if available', async () => {
      const newTokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; // DAI
      
      const result = await service.resolveToken(
        'ethereum',
        newTokenAddress,
        testUserId
      );

      expect(result.isGlobal).toBe(true);
      expect(result.isVerified).toBe(true);
      
      // Verify token was created in database
      const createdToken = await testPrisma.token.findUnique({
        where: {
          chain_address: {
            chain: 'ethereum',
            address: newTokenAddress.toLowerCase()
          }
        }
      });
      
      expect(createdToken).not.toBeNull();
    });

    it('should create user token from contract if Alchemy fails', async () => {
      const customTokenAddress = '0x0123456789012345678901234567890123456789';
      
      const result = await service.resolveToken(
        'ethereum',
        customTokenAddress,
        testUserId
      );

      expect(result.isGlobal).toBe(false);
      expect(result.isVerified).toBe(false);
      expect(result.symbol).toBe('CUSTOM');
      expect(result.source).toBe('contract');
      
      // Verify user token was created
      const userToken = await testPrisma.userToken.findFirst({
        where: {
          userId: testUserId,
          address: customTokenAddress.toLowerCase()
        }
      });
      
      expect(userToken).not.toBeNull();
    });

    it('should create placeholder if both Alchemy and contract fail', async () => {
      const unknownTokenAddress = '0xffffffffffffffffffffffffffffffffffffffff';
      
      const result = await service.resolveToken(
        'ethereum',
        unknownTokenAddress,
        testUserId
      );

      expect(result.isGlobal).toBe(false);
      expect(result.isVerified).toBe(false);
      expect(result.symbol).toBe('0xffff...ffff');
      expect(result.source).toBe('placeholder');
    });

    it('should update lastUsedAt for existing user tokens', async () => {
      // Add custom token using factory
      const { userToken: originalToken } = await factories.tokens.createTokenForUser(
        testUserId,
        {
          id: 'custom-token-2',
          chain: 'ethereum',
          address: '0x2222222222222222222222222222222222222222',
          symbol: 'CUSTOM2',
          name: 'Custom Token 2',
          decimals: 18,
          verified: false
        },
        {
          userLabel: 'My Test Token 2',
          source: 'manual'
        }
      );

      const originalLastUsed = originalToken.lastUsedAt;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await service.resolveToken(
        'ethereum',
        originalToken.address,
        testUserId
      );

      const updatedToken = await testPrisma.userToken.findUnique({
        where: { id: originalToken.id }
      });

      expect(updatedToken!.lastUsedAt).not.toEqual(originalLastUsed);
    });

    it('should handle address normalization correctly', async () => {
      const upperCaseAddress = mockTokens.WETH_ETHEREUM.address.toUpperCase();
      
      const result = await service.resolveToken(
        'ethereum',
        upperCaseAddress,
        testUserId
      );

      expect(result.address).toBe(mockTokens.WETH_ETHEREUM.address.toLowerCase());
    });

    it('should throw error for invalid address format', async () => {
      await expect(
        service.resolveToken('ethereum', 'invalid-address', testUserId)
      ).rejects.toThrow('Invalid Ethereum address');
    });

    it('should throw error for unsupported chain', async () => {
      await expect(
        service.resolveToken('unsupported-chain', mockTokens.WETH_ETHEREUM.address, testUserId)
      ).rejects.toThrow('Unsupported chain');
    });
  });

  describe('resolveTokens', () => {
    it('should resolve multiple tokens efficiently', async () => {
      const tokens = [
        { chain: 'ethereum', address: mockTokens.WETH_ETHEREUM.address },
        { chain: 'ethereum', address: mockTokens.USDC_ETHEREUM.address },
      ];

      const results = await service.resolveTokens(tokens, testUserId);

      expect(results).toHaveLength(2);
      expect(results[0].symbol).toBe('WETH');
      expect(results[1].symbol).toBe('USDC');
      expect(results.every(r => r.isGlobal)).toBe(true);
    });
  });

  describe('addCustomToken', () => {
    it('should add custom token successfully', async () => {
      const tokenData = {
        chain: 'ethereum',
        address: '0x1111111111111111111111111111111111111111',
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 18,
        userLabel: 'My Test Token',
        notes: 'Added manually',
      };

      const result = await service.addCustomToken(testUserId, tokenData);

      expect(result.symbol).toBe('TEST');
      expect(result.userLabel).toBe('My Test Token');
      expect(result.source).toBe('manual');
    });

    it('should throw error if token already exists', async () => {
      // Create existing token using factory
      await factories.tokens.createTokenForUser(
        testUserId,
        {
          id: 'duplicate-token',
          chain: 'ethereum',
          address: '0x3333333333333333333333333333333333333333',
          symbol: 'DUP',
          name: 'Duplicate Token',
          decimals: 18,
          verified: false
        },
        {
          userLabel: 'Existing Token',
          source: 'manual'
        }
      );

      const tokenData = {
        chain: 'ethereum',
        address: '0x3333333333333333333333333333333333333333',
        symbol: 'DUPLICATE',
        name: 'Duplicate Token',
        decimals: 18,
      };

      await expect(
        service.addCustomToken(testUserId, tokenData)
      ).rejects.toThrow('Token already exists in your custom list');
    });
  });

  describe('updateUserToken', () => {
    it('should update user token successfully', async () => {
      const { userToken: token } = await factories.tokens.createTokenForUser(
        testUserId,
        {
          id: 'update-token',
          chain: 'ethereum',
          address: '0x4444444444444444444444444444444444444444',
          symbol: 'UPDATE',
          name: 'Update Token',
          decimals: 18,
          verified: false
        },
        {
          userLabel: 'Original Label',
          source: 'manual',
          notes: 'Original notes'
        }
      );

      const updates = {
        userLabel: 'Updated Label',
        notes: 'Updated notes',
      };

      const result = await service.updateUserToken(
        testUserId,
        token.id,
        updates
      );

      expect(result.userLabel).toBe('Updated Label');
      expect(result.notes).toBe('Updated notes');
    });

    it('should throw error if token not found or not owned', async () => {
      await expect(
        service.updateUserToken(testUserId, 'non-existent-id', {})
      ).rejects.toThrow('Token not found or not owned by user');
    });
  });

  describe('removeUserToken', () => {
    it('should remove user token successfully', async () => {
      const { userToken: token } = await factories.tokens.createTokenForUser(
        testUserId,
        {
          id: 'remove-token',
          chain: 'ethereum',
          address: '0x5555555555555555555555555555555555555555',
          symbol: 'REMOVE',
          name: 'Remove Token',
          decimals: 18,
          verified: false
        },
        {
          userLabel: 'Token to Remove',
          source: 'manual'
        }
      );

      await service.removeUserToken(testUserId, token.id);

      const deletedToken = await testPrisma.userToken.findUnique({
        where: { id: token.id }
      });

      expect(deletedToken).toBeNull();
    });

    it('should throw error if token is used in pools', async () => {
      // Create a pool with user token dependency using factory
      const pool = await factories.pools.createWethUsdcPool(testUserId);
      
      // Create a custom user token that will be referenced in the pool
      const { userToken: customToken } = await factories.tokens.createTokenForUser(
        testUserId,
        {
          id: 'pool-dependent-token',
          chain: 'ethereum',
          address: '0x6666666666666666666666666666666666666666',
          symbol: 'POOLED',
          name: 'Pooled Token',
          decimals: 18,
          verified: false
        },
        {
          userLabel: 'Pooled Token',
          source: 'manual'
        }
      );

      // Create token reference that will be used by a pool
      const tokenRef = await testPrisma.tokenReference.create({
        data: {
          tokenType: 'user',
          userTokenId: customToken.id,
          chain: 'ethereum',
          address: customToken.address,
          symbol: customToken.symbol,
        },
      });

      // Update the existing pool to use our custom token
      await testPrisma.pool.update({
        where: { id: pool.id },
        data: {
          token0RefId: tokenRef.id,
          token0Address: customToken.address,
        }
      });

      await expect(
        service.removeUserToken(testUserId, customToken.id)
      ).rejects.toThrow('Cannot remove token that is used in pools');
    });
  });

  describe('getUserTokens', () => {
    it('should get user tokens filtered by chain', async () => {
      // Create tokens on ethereum using factory
      await factories.tokens.createTokenForUser(
        testUserId,
        {
          id: 'chain-filter-1',
          chain: 'ethereum',
          address: '0x7777777777777777777777777777777777777777',
          symbol: 'FILT1',
          name: 'Filter Token 1',
          decimals: 18,
          verified: false
        },
        { userLabel: 'Filter Token 1', source: 'manual' }
      );

      await factories.tokens.createTokenForUser(
        testUserId,
        {
          id: 'chain-filter-2',
          chain: 'ethereum',
          address: '0x8888888888888888888888888888888888888888',
          symbol: 'FILT2',
          name: 'Filter Token 2',
          decimals: 18,
          verified: false
        },
        { userLabel: 'Filter Token 2', source: 'manual' }
      );

      const tokens = await service.getUserTokens(testUserId, 'ethereum');

      expect(tokens).toHaveLength(2);
      expect(tokens.every(t => t.chain === 'ethereum')).toBe(true);
    });

    it('should get all user tokens if no chain filter', async () => {
      // Create tokens on different chains using factory
      await factories.tokens.createTokenForUser(
        testUserId,
        {
          id: 'multi-chain-1',
          chain: 'ethereum',
          address: '0x9999999999999999999999999999999999999999',
          symbol: 'MULTI1',
          name: 'Multi Chain Token 1',
          decimals: 18,
          verified: false
        },
        { userLabel: 'Multi Chain Token 1', source: 'manual' }
      );

      await factories.tokens.createTokenForUser(
        testUserId,
        {
          id: 'multi-chain-2',
          chain: 'arbitrum',
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          symbol: 'MULTI2',
          name: 'Multi Chain Token 2',
          decimals: 18,
          verified: false
        },
        { userLabel: 'Multi Chain Token 2', source: 'manual' }
      );

      const tokens = await service.getUserTokens(testUserId);

      expect(tokens).toHaveLength(2);
    });
  });

  describe('enrichUserTokens', () => {
    it('should upgrade custom tokens to global when they become available', async () => {
      // Add a placeholder token for a known address that will be found by Alchemy (WETH)
      const wethAddress = mockTokens.WETH_ETHEREUM.address;
      await factories.tokens.createTokenForUser(
        testUserId,
        {
          id: 'enrich-token',
          chain: 'ethereum',
          address: wethAddress,
          symbol: 'UNKNOWN',
          name: 'Unknown Token',
          decimals: 18,
          verified: false
        },
        {
          userLabel: 'Unknown Token',
          source: 'placeholder'
        }
      );

      const enrichedCount = await service.enrichUserTokens(testUserId);

      expect(enrichedCount).toBe(1);

      // Verify token was moved to global (should already exist from seed data)
      const globalToken = await testPrisma.token.findUnique({
        where: {
          chain_address: {
            chain: 'ethereum',
            address: wethAddress
          }
        }
      });

      expect(globalToken).not.toBeNull();
      expect(globalToken!.verified).toBe(true);

      // Verify user token was removed
      const userToken = await testPrisma.userToken.findFirst({
        where: {
          userId: testUserId,
          address: wethAddress
        }
      });

      expect(userToken).toBeNull();
    });
  });
});