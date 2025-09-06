import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { GET, POST } from './route';
import { createTestRequest } from '../../../__tests__/utils/testRequest';
import { TOKEN_ADDRESSES } from '../../../__tests__/fixtures/tokens';

describe('/api/tokens', () => {
  let testPrisma: PrismaClient;

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
    
    // Inject test prisma client for API routes
    globalThis.__testPrisma = testPrisma;
  });

  beforeEach(async () => {
    // Clean up database before each test
    await testPrisma.position.deleteMany();
    await testPrisma.pool.deleteMany();
    await testPrisma.token.deleteMany();
    await testPrisma.user.deleteMany();
  });

  afterAll(async () => {
    // Clean up and disconnect
    await testPrisma.position.deleteMany();
    await testPrisma.pool.deleteMany();
    await testPrisma.token.deleteMany();
    await testPrisma.user.deleteMany();
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
      const request = createTestRequest('/api/tokens', {
        searchParams: {
          chain: 'ethereum',
          address: TOKEN_ADDRESSES.ethereum.WETH,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Token not found');
    });

    it('should return token if it exists', async () => {
      // Create token first
      await testPrisma.token.create({
        data: {
          chain: 'ethereum',
          address: TOKEN_ADDRESSES.ethereum.WETH.toLowerCase(),
          symbol: 'WETH',
          name: 'Wrapped Ether',
          decimals: 18,
          verified: true,
        },
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
      expect(data.error).toContain('Invalid Ethereum address format');
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
      expect(data.error).toBe('Missing required parameters: chain and address');
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
      expect(data.error).toBe('Missing required parameters: chain and address');
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
      expect(data.token.verified).toBe(true);
    });

    it('should update existing token', async () => {
      // Create initial token
      await testPrisma.token.create({
        data: {
          chain: 'ethereum',
          address: TOKEN_ADDRESSES.ethereum.WETH.toLowerCase(),
          symbol: 'OLD_SYMBOL',
          name: 'Old Name',
          decimals: 6,
          verified: false,
        },
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
      expect(data.token.verified).toBe(true);
    });

    it('should return 400 for invalid address format', async () => {
      const request = createTestRequest('/api/tokens', {
        method: 'POST',
        body: {
          chain: 'ethereum',
          address: 'invalid-address',
          symbol: 'TEST',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid Ethereum address format');
    });

    it('should return 400 for unsupported chain', async () => {
      const request = createTestRequest('/api/tokens', {
        method: 'POST',
        body: {
          chain: 'unsupported-chain',
          address: TOKEN_ADDRESSES.ethereum.WETH,
          symbol: 'WETH',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Unsupported chain');
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