import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Setup comprehensive mocking BEFORE importing routes
import { setupApiRouteTestEnvironment } from '../../../../__tests__/mocks/nextRequestContext';
import { createTestFactorySuite } from '../../../../__tests__/factories';
import { createTestRequest } from '../../../../__tests__/utils/testRequest';
import { TOKEN_ADDRESSES } from '../../../../__tests__/fixtures/tokens';

const apiTestEnv = setupApiRouteTestEnvironment();

// Import route handlers AFTER mocking setup
import { GET } from './route';

describe('/api/tokens/search', () => {
  let testPrisma: PrismaClient;
  let factories: ReturnType<typeof createTestFactorySuite>;

  beforeAll(async () => {
    // Set up test environment
    process.env.ALCHEMY_TOKEN_API_KEY = 'test-api-key';

    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://duncan:dev123@localhost:5432/duncan_test',
        },
      },
    });

    await testPrisma.$connect();
    
    // Initialize factories
    factories = createTestFactorySuite(testPrisma);
    
    // Inject test prisma client for API routes
    globalThis.__testPrisma = testPrisma;
  });

  beforeEach(async () => {
    // Clean up database before each test
    await factories.cleanup();

    // Create test user and tokens using factories
    const { user, sessionData } = await factories.users.createUserForApiTest('search-test-user');
    
    // Create test tokens using factory
    await factories.tokens.createCommonTokens('ethereum');
    await factories.tokens.createCommonTokens('arbitrum');
    
    // Create additional test tokens for search functionality
    await testPrisma.token.create({
      data: {
        id: 'unverified-token',
        chain: 'ethereum',
        address: '0x1234567890123456789012345678901234567890',
        symbol: 'UNVERIFIED',
        name: 'Unverified Token',
        decimals: 18,
        verified: false,
      }
    });
  });

  afterAll(async () => {
    // Final cleanup and disconnect
    await factories.cleanup();
    await testPrisma.$disconnect();
    
    // Clean up global reference and API test environment
    globalThis.__testPrisma = undefined;
    apiTestEnv.cleanup();
  });

  describe('GET /api/tokens/search', () => {
    it('should return all tokens when no parameters are provided', async () => {
      const request = createTestRequest('/api/tokens/search');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokens).toBeDefined();
      expect(Array.isArray(data.tokens)).toBe(true);
      expect(data.tokens.length).toBeGreaterThan(0);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.limit).toBe(20);
      expect(data.pagination.offset).toBe(0);
    });

    it('should search tokens by symbol', async () => {
      const request = createTestRequest('/api/tokens/search', {
        searchParams: { query: 'WETH' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokens.length).toBeGreaterThanOrEqual(1);
      expect(data.tokens.every((token: any) => token.symbol.includes('WETH'))).toBe(true);
    });

    it('should search tokens by name', async () => {
      const request = createTestRequest('/api/tokens/search', {
        searchParams: { query: 'Wrapped' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokens.length).toBeGreaterThanOrEqual(1);
      expect(data.tokens.every((token: any) => token.name.includes('Wrapped'))).toBe(true);
    });

    it('should filter tokens by chain', async () => {
      const request = createTestRequest('/api/tokens/search', {
        searchParams: { chain: 'ethereum' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokens.every((token: any) => token.chain === 'ethereum')).toBe(true);
    });

    it('should filter verified tokens only', async () => {
      const request = createTestRequest('/api/tokens/search', {
        searchParams: { verifiedOnly: 'true' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokens.every((token: any) => token.verified === true)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const request = createTestRequest('/api/tokens/search', {
        searchParams: { limit: '2' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokens.length).toBeLessThanOrEqual(2);
      expect(data.pagination.limit).toBe(2);
    });

    it('should respect offset parameter', async () => {
      // Get first page
      const firstPageRequest = createTestRequest('/api/tokens/search', {
        searchParams: { limit: '1', offset: '0' },
      });
      const firstPageResponse = await GET(firstPageRequest);
      const firstPageData = await firstPageResponse.json();

      // Get second page
      const secondPageRequest = createTestRequest('/api/tokens/search', {
        searchParams: { limit: '1', offset: '1' },
      });
      const secondPageResponse = await GET(secondPageRequest);
      const secondPageData = await secondPageResponse.json();

      expect(firstPageResponse.status).toBe(200);
      expect(secondPageResponse.status).toBe(200);
      expect(firstPageData.pagination.offset).toBe(0);
      expect(secondPageData.pagination.offset).toBe(1);

      // Should return different tokens (if we have more than 1)
      if (firstPageData.tokens.length > 0 && secondPageData.tokens.length > 0) {
        expect(firstPageData.tokens[0].id).not.toBe(secondPageData.tokens[0].id);
      }
    });

    it('should cap limit at 100', async () => {
      const request = createTestRequest('/api/tokens/search', {
        searchParams: { limit: '150' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.limit).toBe(100);
    });

    it('should handle invalid limit gracefully', async () => {
      const request = createTestRequest('/api/tokens/search', {
        searchParams: { limit: 'invalid' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid limit or offset parameter');
    });

    it('should handle invalid offset gracefully', async () => {
      const request = createTestRequest('/api/tokens/search', {
        searchParams: { offset: 'invalid' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid limit or offset parameter');
    });

    it('should handle negative offset by setting it to 0', async () => {
      const request = createTestRequest('/api/tokens/search', {
        searchParams: { offset: '-5' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.offset).toBe(0);
    });

    it('should prioritize verified tokens in results', async () => {
      const request = createTestRequest('/api/tokens/search', {
        searchParams: { chain: 'ethereum' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Find first verified and unverified token
      const firstUnverifiedIndex = data.tokens.findIndex((token: any) => !token.verified);
      const lastVerifiedIndex = data.tokens.reduce((lastIndex: number, token: any, index: number) => 
        token.verified ? index : lastIndex, -1);
      
      // If both exist, verified should come before unverified
      if (firstUnverifiedIndex !== -1 && lastVerifiedIndex !== -1) {
        expect(lastVerifiedIndex).toBeLessThan(firstUnverifiedIndex);
      }
    });

    it('should combine multiple filters', async () => {
      const request = createTestRequest('/api/tokens/search', {
        searchParams: {
          chain: 'ethereum',
          query: 'USD',
          verifiedOnly: 'true',
          limit: '5',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokens.every((token: any) => 
        token.chain === 'ethereum' && 
        token.verified === true &&
        (token.symbol.includes('USD') || token.name.includes('USD'))
      )).toBe(true);
    });
  });
});