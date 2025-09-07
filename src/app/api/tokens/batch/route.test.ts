import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from './route';
import { mockTokens } from '@/__tests__/fixtures/tokens';
import { TokenResolutionService } from '@/services/tokens/tokenResolutionService';

// Mock TokenResolutionService - using a simpler approach
vi.mock('@/services/tokens/tokenResolutionService');

// Mock session
const mockSession = {
  user: {
    id: 'test-user-id',
  },
};

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(() => Promise.resolve(mockSession)),
}));

// Mock PrismaClient
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({})),
}));

describe('/api/tokens/batch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    it('should successfully resolve tokens from addresses', async () => {
      const mockTokensArray = [
        { ...mockTokens.WETH_ETHEREUM, isGlobal: true, isVerified: true },
        { ...mockTokens.USDC_ETHEREUM, isGlobal: true, isVerified: true }
      ];
      mockResolveTokens.mockResolvedValue(mockTokensArray);

      const request = createRequest({
        chain: 'ethereum',
        addresses: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokens).toEqual(mockTokensArray);
      expect(data.count).toBe(2);
      
      expect(mockResolveTokens).toHaveBeenCalledWith(
        [
          { chain: 'ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
          { chain: 'ethereum', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' }
        ],
        'test-user-id'
      );
    });

    it('should handle single token address', async () => {
      const mockTokensArray = [{ ...mockTokens.WETH_ETHEREUM, isGlobal: true, isVerified: true }];
      mockResolveTokens.mockResolvedValue(mockTokensArray);

      const request = createRequest({
        chain: 'ethereum',
        addresses: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokens).toEqual(mockTokensArray);
      expect(data.count).toBe(1);
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
      expect(mockResolveTokens).not.toHaveBeenCalled();
    });

    it('should return 400 when chain is missing', async () => {
      const request = createRequest({
        addresses: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters: chain and addresses (array)');
      expect(mockResolveTokens).not.toHaveBeenCalled();
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
      expect(mockResolveTokens).not.toHaveBeenCalled();
    });

    it('should handle exactly 100 addresses', async () => {
      const addresses = Array.from({ length: 100 }, (_, i) => `0x${'0'.repeat(38)}${i.toString().padStart(2, '0')}`);
      const mockTokensArray = addresses.map(() => ({ ...mockTokens.WETH_ETHEREUM, isGlobal: true, isVerified: true }));
      mockResolveTokens.mockResolvedValue(mockTokensArray);

      const request = createRequest({
        chain: 'ethereum',
        addresses,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBe(100);
      expect(mockResolveTokens).toHaveBeenCalledWith(
        addresses.map(address => ({ chain: 'ethereum', address })), 
        'test-user-id'
      );
    });

    it('should handle TokenResolutionService validation errors', async () => {
      mockResolveTokens.mockRejectedValue(
        new Error('Invalid chain: unsupported')
      );

      const request = createRequest({
        chain: 'unsupported',
        addresses: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid chain: unsupported');
    });

    it('should handle TokenService unsupported chain errors', async () => {
      mockTokenService.createTokensFromAddresses.mockRejectedValue(
        new Error('Unsupported chain: polygon')
      );

      const request = createRequest({
        chain: 'polygon',
        addresses: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Unsupported chain: polygon');
    });

    it('should handle generic TokenResolutionService errors', async () => {
      mockResolveTokens.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createRequest({
        chain: 'ethereum',
        addresses: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle non-Error exceptions', async () => {
      mockResolveTokens.mockRejectedValue('String error');

      const request = createRequest({
        chain: 'ethereum',
        addresses: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/tokens/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid-json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
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

    it('should successfully resolve tokens by addresses', async () => {
      const mockTokensArray = [
        { ...mockTokens.WETH_ETHEREUM, isGlobal: true, isVerified: true },
        { ...mockTokens.USDC_ETHEREUM, isGlobal: true, isVerified: true }
      ];
      mockResolveTokens.mockResolvedValue(mockTokensArray);

      const request = createRequest({
        chain: 'ethereum',
        addresses: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokens).toEqual(mockTokensArray);
      expect(data.count).toBe(2);
      
      expect(mockResolveTokens).toHaveBeenCalledWith(
        [
          { chain: 'ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
          { chain: 'ethereum', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' }
        ],
        'test-user-id'
      );
    });

    it('should handle single address', async () => {
      const mockTokensArray = [{ ...mockTokens.WETH_ETHEREUM, isGlobal: true, isVerified: true }];
      mockResolveTokens.mockResolvedValue(mockTokensArray);

      const request = createRequest({
        chain: 'ethereum',
        addresses: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokens).toEqual(mockTokensArray);
      expect(data.count).toBe(1);
    });

    it('should handle addresses with spaces and empty strings', async () => {
      const mockTokensArray = [mockTokens.WETH_ETHEREUM];
      mockResolveTokens.mockResolvedValue(mockTokensArray);

      const request = createRequest({
        chain: 'ethereum',
        addresses: ' 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 , , 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 ',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockResolveTokens).toHaveBeenCalledWith(
        'ethereum',
        ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48']
      );
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
      expect(mockResolveTokens).not.toHaveBeenCalled();
    });

    it('should handle addresses with only commas and spaces', async () => {
      const request = createRequest({
        chain: 'ethereum',
        addresses: ' , , , ',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokens).toEqual([]);
      expect(mockResolveTokens).not.toHaveBeenCalled();
    });

    it('should return 400 when chain is missing', async () => {
      const request = createRequest({
        addresses: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters: chain and addresses');
      expect(mockResolveTokens).not.toHaveBeenCalled();
    });

    it('should return 400 when addresses parameter is missing', async () => {
      const request = createRequest({
        chain: 'ethereum',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters: chain and addresses');
    });

    it('should return 400 when more than 100 addresses provided', async () => {
      const addresses = Array.from({ length: 101 }, (_, i) => `0x${'0'.repeat(38)}${i.toString().padStart(2, '0')}`).join(',');
      
      const request = createRequest({
        chain: 'ethereum',
        addresses,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Maximum 100 addresses allowed per batch request');
      expect(mockResolveTokens).not.toHaveBeenCalled();
    });

    it('should handle exactly 100 addresses', async () => {
      const addresses = Array.from({ length: 100 }, (_, i) => `0x${'0'.repeat(38)}${i.toString().padStart(2, '0')}`);
      const addressesParam = addresses.join(',');
      const mockTokensArray = addresses.map(() => mockTokens.WETH_ETHEREUM);
      mockResolveTokens.mockResolvedValue(mockTokensArray);

      const request = createRequest({
        chain: 'ethereum',
        addresses: addressesParam,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBe(100);
      expect(mockResolveTokens).toHaveBeenCalledWith('ethereum', addresses);
    });

    it('should handle TokenService validation errors', async () => {
      mockResolveTokens.mockRejectedValue(
        new Error('Invalid chain: unsupported')
      );

      const request = createRequest({
        chain: 'unsupported',
        addresses: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid chain: unsupported');
    });

    it('should handle generic TokenService errors', async () => {
      mockResolveTokens.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createRequest({
        chain: 'ethereum',
        addresses: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle non-Error exceptions in GET', async () => {
      mockResolveTokens.mockRejectedValue('String error');

      const request = createRequest({
        chain: 'ethereum',
        addresses: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});