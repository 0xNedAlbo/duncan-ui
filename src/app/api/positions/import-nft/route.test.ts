import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from './route';
import { mockNFTPositions } from '@/__tests__/fixtures/nftPositions';

// Mock the NFT position service
vi.mock('@/services/uniswap/nftPosition', () => ({
  fetchNFTPosition: vi.fn(),
}));

import { fetchNFTPosition } from '@/services/uniswap/nftPosition';

describe('/api/positions/import-nft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST', () => {
    const createRequest = (body: any) => {
      return new NextRequest('http://localhost:3000/api/positions/import-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    };

    it('should successfully import NFT position from Ethereum', async () => {
      const mockPosition = mockNFTPositions.ACTIVE_WETH_USDC_ETHEREUM;
      vi.mocked(fetchNFTPosition).mockResolvedValue(mockPosition);

      const request = createRequest({
        chain: 'ethereum',
        nftId: '12345',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPosition);
      expect(data.error).toBeUndefined();
      
      expect(fetchNFTPosition).toHaveBeenCalledWith('ethereum', '12345');
    });

    it('should successfully import NFT position from Arbitrum', async () => {
      const mockPosition = mockNFTPositions.ACTIVE_POSITION_ARBITRUM;
      vi.mocked(fetchNFTPosition).mockResolvedValue(mockPosition);

      const request = createRequest({
        chain: 'arbitrum',
        nftId: '54321',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPosition);
      
      expect(fetchNFTPosition).toHaveBeenCalledWith('arbitrum', '54321');
    });

    it('should successfully import NFT position from Base', async () => {
      const mockPosition = mockNFTPositions.ACTIVE_POSITION_BASE;
      vi.mocked(fetchNFTPosition).mockResolvedValue(mockPosition);

      const request = createRequest({
        chain: 'base',
        nftId: '98765',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPosition);
      
      expect(fetchNFTPosition).toHaveBeenCalledWith('base', '98765');
    });

    it('should handle case-insensitive chain names', async () => {
      const mockPosition = mockNFTPositions.ACTIVE_WETH_USDC_ETHEREUM;
      vi.mocked(fetchNFTPosition).mockResolvedValue(mockPosition);

      const request = createRequest({
        chain: 'ETHEREUM',
        nftId: '12345',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Should convert to lowercase before calling service
      expect(fetchNFTPosition).toHaveBeenCalledWith('ethereum', '12345');
    });

    it('should return 400 when chain is missing', async () => {
      const request = createRequest({
        nftId: '12345',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Chain and NFT ID are required');
      expect(fetchNFTPosition).not.toHaveBeenCalled();
    });

    it('should return 400 when nftId is missing', async () => {
      const request = createRequest({
        chain: 'ethereum',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Chain and NFT ID are required');
      expect(fetchNFTPosition).not.toHaveBeenCalled();
    });

    it('should return 400 when both chain and nftId are missing', async () => {
      const request = createRequest({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Chain and NFT ID are required');
    });

    it('should return 400 when chain is empty string', async () => {
      const request = createRequest({
        chain: '',
        nftId: '12345',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Chain and NFT ID are required');
    });

    it('should return 400 when nftId is empty string', async () => {
      const request = createRequest({
        chain: 'ethereum',
        nftId: '',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Chain and NFT ID are required');
    });

    it('should return 400 for invalid NFT ID format (non-numeric)', async () => {
      const request = createRequest({
        chain: 'ethereum',
        nftId: 'invalid-id',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('NFT ID must be a valid positive number');
      expect(fetchNFTPosition).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid NFT ID format (zero)', async () => {
      const request = createRequest({
        chain: 'ethereum',
        nftId: '0',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('NFT ID must be a valid positive number');
    });

    it('should return 400 for invalid NFT ID format (negative)', async () => {
      const request = createRequest({
        chain: 'ethereum',
        nftId: '-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('NFT ID must be a valid positive number');
    });

    it('should accept valid numeric NFT ID as string', async () => {
      const mockPosition = mockNFTPositions.ACTIVE_WETH_USDC_ETHEREUM;
      vi.mocked(fetchNFTPosition).mockResolvedValue(mockPosition);

      const request = createRequest({
        chain: 'ethereum',
        nftId: '12345',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 for unsupported chain', async () => {
      const request = createRequest({
        chain: 'polygon',
        nftId: '12345',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unsupported chain: polygon. Supported chains: ethereum, arbitrum, base');
      expect(fetchNFTPosition).not.toHaveBeenCalled();
    });

    it('should return 400 for multiple unsupported chains', async () => {
      const unsupportedChains = ['polygon', 'optimism', 'bsc', 'avalanche'];
      
      for (const chain of unsupportedChains) {
        const request = createRequest({
          chain,
          nftId: '12345',
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain(`Unsupported chain: ${chain}`);
      }
    });

    it('should return 404 when NFT does not exist', async () => {
      vi.mocked(fetchNFTPosition).mockRejectedValue(
        new Error('NFT with ID 99999999 does not exist on ethereum')
      );

      const request = createRequest({
        chain: 'ethereum',
        nftId: '99999999',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('NFT with ID 99999999 does not exist on ethereum');
      
      expect(fetchNFTPosition).toHaveBeenCalledWith('ethereum', '99999999');
    });

    it('should return 404 for network errors', async () => {
      vi.mocked(fetchNFTPosition).mockRejectedValue(
        new Error('Network error while fetching position from ethereum')
      );

      const request = createRequest({
        chain: 'ethereum',
        nftId: '12345',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Network error while fetching position from ethereum');
    });

    it('should handle generic service errors', async () => {
      vi.mocked(fetchNFTPosition).mockRejectedValue(
        new Error('Failed to fetch NFT position: Contract call failed')
      );

      const request = createRequest({
        chain: 'ethereum',
        nftId: '12345',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch NFT position: Contract call failed');
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(fetchNFTPosition).mockRejectedValue('String error');

      const request = createRequest({
        chain: 'ethereum',
        nftId: '12345',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('String error');
    });

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/positions/import-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid-json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request format');
      expect(fetchNFTPosition).not.toHaveBeenCalled();
    });

    it('should handle null values in request', async () => {
      const request = createRequest({
        chain: null,
        nftId: null,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Chain and NFT ID are required');
    });
  });

  describe('GET', () => {
    it('should return 405 Method Not Allowed', async () => {
      const request = new NextRequest('http://localhost:3000/api/positions/import-nft', {
        method: 'GET',
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method not allowed');
    });
  });
});