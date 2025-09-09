import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { POST, GET } from './route';
import { mockTokens } from '@/__tests__/fixtures/tokens';
import { createTestFactorySuite } from '@/__tests__/factories';

// Mock getSession
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

import { getSession } from '@/lib/auth';

describe('/api/tokens/batch', () => {
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
    const { user, sessionData } = await factories.users.createUserForApiTest('batch-test-user');
    
    // Mock authenticated session by default
    vi.mocked(getSession).mockResolvedValue(sessionData);
    
    vi.clearAllMocks();
  });

  afterAll(async () => {
    // Final cleanup and disconnect
    await factories.cleanup();
    await testPrisma.$disconnect();
    
    // Clean up global reference
    globalThis.__testPrisma = undefined;
  });

  describe('POST', () => {
    const createRequest = (body: any) => {
      return new NextRequest('http://localhost:3000/api/tokens/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    };

    it('should return 400 when chain is missing', async () => {
      const request = createRequest({
        addresses: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters: chain and addresses (array)');
    });

    it('should return 400 when addresses is missing', async () => {
      const request = createRequest({
        chain: 'ethereum',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters: chain and addresses (array)');
    });

    it('should return 400 when addresses is not an array', async () => {
      const request = createRequest({
        chain: 'ethereum',
        addresses: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters: chain and addresses (array)');
    });

    it('should handle empty addresses array', async () => {
      const request = createRequest({
        chain: 'ethereum',
        addresses: [],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokens).toEqual([]);
      expect(data.count).toBe(0);
    });

    it('should return 400 when addresses array contains non-strings', async () => {
      const request = createRequest({
        chain: 'ethereum',
        addresses: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 123, null],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('All addresses must be strings');
    });

    it('should return 400 when more than 100 addresses provided', async () => {
      const addresses = Array.from({ length: 101 }, (_, i) => `0x${'0'.repeat(38)}${i.toString().padStart(2, '0')}`);
      
      const request = createRequest({
        chain: 'ethereum',
        addresses,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Maximum 100 addresses allowed per batch request');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/tokens/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON format');
    });

    it('should handle null chain value', async () => {
      const request = createRequest({
        chain: null,
        addresses: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters: chain and addresses (array)');
    });

    it('should handle empty string chain', async () => {
      const request = createRequest({
        chain: '',
        addresses: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters: chain and addresses (array)');
    });
  });

  describe('GET', () => {
    const createRequest = (searchParams: Record<string, string>) => {
      const url = new URL('http://localhost:3000/api/tokens/batch');
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      
      return new NextRequest(url.toString(), {
        method: 'GET',
      });
    };

    it('should return 400 when addresses parameter is missing', async () => {
      const request = createRequest({
        chain: 'ethereum',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters: chain and addresses');
    });

    it('should return 400 when chain parameter is missing', async () => {
      const request = createRequest({
        addresses: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters: chain and addresses');
    });

    it('should handle empty addresses parameter', async () => {
      const request = createRequest({
        chain: 'ethereum',
        addresses: '',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokens).toEqual([]);
      expect(data.count).toBe(0);
    });
  });
});