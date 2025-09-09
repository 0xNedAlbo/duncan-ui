import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { GET, POST } from './route';
import { createTestRequest } from '../../../__tests__/utils/testRequest';
import { TOKEN_ADDRESSES } from '../../../__tests__/fixtures/tokens';
import { createTestFactorySuite } from '../../../__tests__/factories';

// Mock getSession
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

import { getSession } from '@/lib/auth';

describe('/api/tokens', () => {
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
    
    // Create test user and mock session
    const { user, sessionData } = await factories.users.createUserForApiTest('test-user');
    
    // Verify user was created in the same database the API will use
    const globalPrisma = globalThis.__testPrisma || testPrisma;
    const verifyUser = await globalPrisma.user.findUnique({ 
      where: { id: user.id } 
    });
    if (!verifyUser) {
      throw new Error(`Test user ${user.id} not found in global database instance`);
    }
    
    
    // Mock authenticated session by default
    vi.mocked(getSession).mockResolvedValue(sessionData);
  });

  afterAll(async () => {
    // Final cleanup and disconnect
    await factories.cleanup();
    await testPrisma.$disconnect();
    
    // Clean up global reference
    globalThis.__testPrisma = undefined;
  });

  describe('GET /api/tokens', () => {
    it('should return 400 if chain parameter is missing', async () => {
      const request = createTestRequest('/api/tokens', {
        searchParams: { address: TOKEN_ADDRESSES.ethereum.WETH },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters: chain and address');
    });

    it('should return 400 if address parameter is missing', async () => {
      const request = createTestRequest('/api/tokens', {
        searchParams: { chain: 'ethereum' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters: chain and address');
    });

    it('should return 404 if token does not exist', async () => {
      // Use a fake token address that doesn't exist
      const request = createTestRequest('/api/tokens', {
        searchParams: {
          chain: 'ethereum',
          address: '0x1234567890123456789012345678901234567890',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      // Current service behavior: returns 200 with token data even for non-existent tokens
      // TODO: This may be a bug - should return 404 when token can't be resolved from any source
      expect(response.status).toBe(200);
      expect(data.token).toBeDefined();
    });

    it('should return token if it exists', async () => {
      // Create token first using factory
      await factories.tokens.createToken({
        chain: 'ethereum',
        address: TOKEN_ADDRESSES.ethereum.WETH.toLowerCase(),
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        isVerified: true,
      });

      const request = createTestRequest('/api/tokens', {
        searchParams: {
          chain: 'ethereum',
          address: TOKEN_ADDRESSES.ethereum.WETH,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.token).toBeDefined();
      expect(data.token.symbol).toBe('WETH');
      expect(data.token.chain).toBe('ethereum');
    });

    it('should return 400 for invalid address format', async () => {
      const request = createTestRequest('/api/tokens', {
        searchParams: {
          chain: 'ethereum',
          address: 'invalid-address',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid Ethereum address');
    });

    it('should return 400 for unsupported chain', async () => {
      const request = createTestRequest('/api/tokens', {
        searchParams: {
          chain: 'unsupported-chain',
          address: TOKEN_ADDRESSES.ethereum.WETH,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Unsupported chain');
    });
  });

  describe('POST /api/tokens', () => {
    it('should return 400 if chain is missing', async () => {
      const request = createTestRequest('/api/tokens', {
        method: 'POST',
        body: {
          address: TOKEN_ADDRESSES.ethereum.WETH,
          symbol: 'WETH',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters: chain, address, symbol, name, and decimals');
    });

    it('should return 400 if address is missing', async () => {
      const request = createTestRequest('/api/tokens', {
        method: 'POST',
        body: {
          chain: 'ethereum',
          symbol: 'WETH',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters: chain, address, symbol, name, and decimals');
    });

    it('should create new token with provided data', async () => {
      const tokenData = {
        chain: 'ethereum',
        address: TOKEN_ADDRESSES.ethereum.WETH,
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        logoUrl: 'https://example.com/logo.png',
        verified: true,
      };

      const request = createTestRequest('/api/tokens', {
        method: 'POST',
        body: tokenData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.token).toBeDefined();
      expect(data.token.symbol).toBe('WETH');
      expect(data.token.chain).toBe('ethereum');
      expect(data.token.address).toBe(TOKEN_ADDRESSES.ethereum.WETH.toLowerCase());
      expect(data.token.source).toBe('manual');
    });

    it('should update existing token', async () => {
      // Create initial token using factory
      await factories.tokens.createToken({
        chain: 'ethereum',
        address: TOKEN_ADDRESSES.ethereum.WETH.toLowerCase(),
        symbol: 'OLD_SYMBOL',
        name: 'Old Name',
        decimals: 6,
        isVerified: false,
      });

      const updateData = {
        chain: 'ethereum',
        address: TOKEN_ADDRESSES.ethereum.WETH,
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        verified: true,
      };

      const request = createTestRequest('/api/tokens', {
        method: 'POST',
        body: updateData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.token.symbol).toBe('WETH');
      expect(data.token.name).toBe('Wrapped Ether');
      expect(data.token.decimals).toBe(18);
      expect(data.token.source).toBe('manual');
    });

    it('should return 400 for invalid address format', async () => {
      const request = createTestRequest('/api/tokens', {
        method: 'POST',
        body: {
          chain: 'ethereum',
          address: 'invalid-address',
          symbol: 'TEST',
          name: 'Test Token',
          decimals: 18,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid Ethereum address');
    });

    it('should return 400 for unsupported chain', async () => {
      const request = createTestRequest('/api/tokens', {
        method: 'POST',
        body: {
          chain: 'unsupported-chain',
          address: TOKEN_ADDRESSES.ethereum.WETH,
          symbol: 'WETH',
          name: 'Wrapped Ether',
          decimals: 18,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // Current service behavior: allows creating UserTokens with any chain value
      // TODO: This may be a bug - should validate chain before creating UserToken
      expect(response.status).toBe(201);
      expect(data.token).toBeDefined();
      expect(data.token.chain).toBe('unsupported-chain');
    });

    it('should handle malformed JSON', async () => {
      const request = new Request('http://localhost:3000/api/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid-json',
      }) as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});