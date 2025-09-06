import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchNFTPosition, validateNFTExists, type ParsedNFTPosition } from './nftPosition';
import { 
  mockNFTPositions, 
  mockViemContractData, 
  INVALID_NFT_IDS, 
  SUPPORTED_CHAINS,
  UNSUPPORTED_CHAINS 
} from '@/__tests__/fixtures/nftPositions';

// Mock viem
vi.mock('viem', () => ({
  createPublicClient: vi.fn(),
  http: vi.fn(),
}));

// Mock viem chains
vi.mock('viem/chains', () => ({
  mainnet: { id: 1, name: 'Ethereum' },
  arbitrum: { id: 42161, name: 'Arbitrum One' },
  base: { id: 8453, name: 'Base' },
}));

describe('NFTPositionService', () => {
  let mockPublicClient: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock public client
    mockPublicClient = {
      readContract: vi.fn(),
    };

    // Mock viem's createPublicClient to return our mock
    const { createPublicClient } = await import('viem');
    vi.mocked(createPublicClient).mockReturnValue(mockPublicClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchNFTPosition', () => {
    describe('successful position fetching', () => {
      it('should fetch active WETH/USDC position on Ethereum', async () => {
        const expectedPosition = mockNFTPositions.ACTIVE_WETH_USDC_ETHEREUM;
        const contractData = mockViemContractData[expectedPosition.nftId];

        mockPublicClient.readContract.mockResolvedValue(contractData);

        const result = await fetchNFTPosition('ethereum', expectedPosition.nftId);

        expect(result).toEqual(expectedPosition);
        expect(mockPublicClient.readContract).toHaveBeenCalledWith({
          address: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
          abi: expect.any(Array),
          functionName: 'positions',
          args: [BigInt(expectedPosition.nftId)],
        });
      });

      it('should fetch active position on Arbitrum', async () => {
        const expectedPosition = mockNFTPositions.ACTIVE_POSITION_ARBITRUM;
        const contractData = mockViemContractData[expectedPosition.nftId];

        mockPublicClient.readContract.mockResolvedValue(contractData);

        const result = await fetchNFTPosition('arbitrum', expectedPosition.nftId);

        expect(result).toEqual(expectedPosition);
        expect(mockPublicClient.readContract).toHaveBeenCalledWith({
          address: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // Same address on Arbitrum
          abi: expect.any(Array),
          functionName: 'positions',
          args: [BigInt(expectedPosition.nftId)],
        });
      });

      it('should fetch active position on Base', async () => {
        const expectedPosition = mockNFTPositions.ACTIVE_POSITION_BASE;
        const contractData = mockViemContractData[expectedPosition.nftId];

        mockPublicClient.readContract.mockResolvedValue(contractData);

        const result = await fetchNFTPosition('base', expectedPosition.nftId);

        expect(result).toEqual(expectedPosition);
        expect(mockPublicClient.readContract).toHaveBeenCalledWith({
          address: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1', // Different address on Base
          abi: expect.any(Array),
          functionName: 'positions',
          args: [BigInt(expectedPosition.nftId)],
        });
      });

      it('should identify inactive position with zero liquidity', async () => {
        const expectedPosition = mockNFTPositions.INACTIVE_POSITION_ETHEREUM;
        const contractData = mockViemContractData[expectedPosition.nftId];

        mockPublicClient.readContract.mockResolvedValue(contractData);

        const result = await fetchNFTPosition('ethereum', expectedPosition.nftId);

        expect(result.isActive).toBe(false);
        expect(result.liquidity).toBe('0');
        expect(result).toEqual(expectedPosition);
      });
    });

    describe('chain validation', () => {
      it.each(SUPPORTED_CHAINS)('should support %s chain', async (chain) => {
        const mockData = mockViemContractData['12345'];
        mockPublicClient.readContract.mockResolvedValue(mockData);

        await expect(fetchNFTPosition(chain, '12345')).resolves.toBeDefined();
      });

      it.each(UNSUPPORTED_CHAINS)('should reject unsupported chain: %s', async (chain) => {
        await expect(fetchNFTPosition(chain, '12345')).rejects.toThrow(
          `Unsupported chain: ${chain}`
        );
      });

      it('should handle case-insensitive chain names', async () => {
        const mockData = mockViemContractData['12345'];
        mockPublicClient.readContract.mockResolvedValue(mockData);

        await expect(fetchNFTPosition('ETHEREUM', '12345')).resolves.toBeDefined();
        await expect(fetchNFTPosition('Arbitrum', '12345')).resolves.toBeDefined();
        await expect(fetchNFTPosition('BASE', '12345')).resolves.toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should throw error for non-existent NFT', async () => {
        mockPublicClient.readContract.mockRejectedValue(
          new Error('execution reverted: ERC721: invalid token ID')
        );

        await expect(fetchNFTPosition('ethereum', '99999999')).rejects.toThrow(
          'NFT with ID 99999999 does not exist on ethereum'
        );
      });

      it('should throw error for network issues', async () => {
        mockPublicClient.readContract.mockRejectedValue(
          new Error('network error: timeout')
        );

        await expect(fetchNFTPosition('ethereum', '12345')).rejects.toThrow(
          'Network error while fetching position from ethereum'
        );
      });

      it('should handle generic contract errors', async () => {
        mockPublicClient.readContract.mockRejectedValue(
          new Error('Contract call failed')
        );

        await expect(fetchNFTPosition('ethereum', '12345')).rejects.toThrow(
          'Failed to fetch NFT position: Error: Contract call failed'
        );
      });

      it('should handle non-Error exceptions', async () => {
        mockPublicClient.readContract.mockRejectedValue('String error');

        await expect(fetchNFTPosition('ethereum', '12345')).rejects.toThrow(
          'Failed to fetch NFT position: String error'
        );
      });
    });

    describe('data parsing and type conversion', () => {
      it('should correctly parse BigInt values to strings', async () => {
        const contractData = [
          BigInt(1), // nonce
          '0x0000000000000000000000000000000000000000', // operator
          '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // token0 (USDC)
          '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // token1 (WETH)
          3000, // fee
          -276325, // tickLower
          -276275, // tickUpper
          BigInt('999999999999999999'), // liquidity (very precise)
          BigInt(0), // feeGrowthInside0LastX128
          BigInt(0), // feeGrowthInside1LastX128
          BigInt('123456789'), // tokensOwed0
          BigInt('987654321000000000'), // tokensOwed1
        ] as const;

        mockPublicClient.readContract.mockResolvedValue(contractData);

        const result = await fetchNFTPosition('ethereum', '12345');

        expect(result.liquidity).toBe('999999999999999999');
        expect(result.tokensOwed0).toBe('123456789');
        expect(result.tokensOwed1).toBe('987654321000000000');
        expect(typeof result.liquidity).toBe('string');
        expect(typeof result.tokensOwed0).toBe('string');
        expect(typeof result.tokensOwed1).toBe('string');
      });

      it('should set correct chainId and chainName', async () => {
        const contractData = mockViemContractData['12345'];
        mockPublicClient.readContract.mockResolvedValue(contractData);

        const result = await fetchNFTPosition('arbitrum', '12345');

        expect(result.chainId).toBe(42161);
        expect(result.chainName).toBe('arbitrum');
        expect(result.nftId).toBe('12345');
      });

      it('should handle different fee tiers correctly', async () => {
        const testCases = [
          { fee: 100, expected: 100 }, // 0.01%
          { fee: 500, expected: 500 }, // 0.05%
          { fee: 3000, expected: 3000 }, // 0.3%
          { fee: 10000, expected: 10000 }, // 1%
        ];

        for (const { fee, expected } of testCases) {
          const contractData = [
            BigInt(1), '0x0000000000000000000000000000000000000000',
            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            fee, -276325, -276275, BigInt(1000),
            BigInt(0), BigInt(0), BigInt(0), BigInt(0),
          ] as const;

          mockPublicClient.readContract.mockResolvedValue(contractData);

          const result = await fetchNFTPosition('ethereum', '12345');
          expect(result.fee).toBe(expected);
        }
      });
    });

    describe('edge cases', () => {
      it('should handle position with maximum liquidity', async () => {
        const maxLiquidity = BigInt('340282366920938463463374607431768211455'); // 2^128 - 1
        const contractData = [
          BigInt(1), '0x0000000000000000000000000000000000000000',
          '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          3000, -276325, -276275, maxLiquidity,
          BigInt(0), BigInt(0), BigInt(0), BigInt(0),
        ] as const;

        mockPublicClient.readContract.mockResolvedValue(contractData);

        const result = await fetchNFTPosition('ethereum', '12345');
        expect(result.liquidity).toBe(maxLiquidity.toString());
        expect(result.isActive).toBe(true);
      });

      it('should handle extreme tick values', async () => {
        const minTick = -887272; // Theoretical minimum tick
        const maxTick = 887272;  // Theoretical maximum tick

        const contractData = [
          BigInt(1), '0x0000000000000000000000000000000000000000',
          '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          3000, minTick, maxTick, BigInt(1000),
          BigInt(0), BigInt(0), BigInt(0), BigInt(0),
        ] as const;

        mockPublicClient.readContract.mockResolvedValue(contractData);

        const result = await fetchNFTPosition('ethereum', '12345');
        expect(result.tickLower).toBe(minTick);
        expect(result.tickUpper).toBe(maxTick);
      });
    });
  });

  describe('validateNFTExists', () => {
    it('should return true for existing NFT', async () => {
      const contractData = mockViemContractData['12345'];
      mockPublicClient.readContract.mockResolvedValue(contractData);

      const result = await validateNFTExists('ethereum', '12345');
      expect(result).toBe(true);
    });

    it('should return false for non-existent NFT', async () => {
      mockPublicClient.readContract.mockRejectedValue(
        new Error('execution reverted: ERC721: invalid token ID')
      );

      const result = await validateNFTExists('ethereum', '99999999');
      expect(result).toBe(false);
    });

    it('should return false for network errors', async () => {
      mockPublicClient.readContract.mockRejectedValue(
        new Error('network error: timeout')
      );

      const result = await validateNFTExists('ethereum', '12345');
      expect(result).toBe(false);
    });

    it('should return false for unsupported chains', async () => {
      const result = await validateNFTExists('polygon', '12345');
      expect(result).toBe(false);
    });

    it.each(INVALID_NFT_IDS)('should return false for invalid NFT ID: %s', async (nftId) => {
      mockPublicClient.readContract.mockRejectedValue(
        new Error('execution reverted: ERC721: invalid token ID')
      );

      const result = await validateNFTExists('ethereum', nftId);
      expect(result).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete NFT import workflow', async () => {
      // Test the complete workflow: validate -> fetch -> parse
      const nftId = '12345';
      const chain = 'ethereum';
      const contractData = mockViemContractData[nftId];

      mockPublicClient.readContract.mockResolvedValue(contractData);

      // First validate the NFT exists
      const exists = await validateNFTExists(chain, nftId);
      expect(exists).toBe(true);

      // Then fetch the full position data
      const position = await fetchNFTPosition(chain, nftId);
      expect(position).toBeDefined();
      expect(position.nftId).toBe(nftId);
      expect(position.chainName).toBe(chain);
      expect(position.isActive).toBe(true);

      // Verify contract was called twice (once for validation, once for fetching)
      expect(mockPublicClient.readContract).toHaveBeenCalledTimes(2);
    });

    it('should handle multi-chain position fetching', async () => {
      const chains = ['ethereum', 'arbitrum', 'base'];
      const nftIds = ['12345', '54321', '98765'];
      
      for (let i = 0; i < chains.length; i++) {
        const chain = chains[i];
        const nftId = nftIds[i];
        const contractData = mockViemContractData[nftId];

        mockPublicClient.readContract.mockResolvedValue(contractData);

        const position = await fetchNFTPosition(chain, nftId);
        expect(position.chainName).toBe(chain);
        expect(position.nftId).toBe(nftId);
      }

      expect(mockPublicClient.readContract).toHaveBeenCalledTimes(3);
    });
  });

  describe('performance and reliability', () => {
    it('should handle concurrent NFT fetches', async () => {
      const contractData = mockViemContractData['12345'];
      mockPublicClient.readContract.mockResolvedValue(contractData);

      // Simulate multiple concurrent requests
      const promises = Array.from({ length: 5 }, (_, i) => 
        fetchNFTPosition('ethereum', `1234${i}`)
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      expect(mockPublicClient.readContract).toHaveBeenCalledTimes(5);
    });

    it('should not interfere between different chain calls', async () => {
      const ethereumData = mockViemContractData['12345'];
      const arbitrumData = mockViemContractData['54321'];

      mockPublicClient.readContract
        .mockResolvedValueOnce(ethereumData)
        .mockResolvedValueOnce(arbitrumData);

      const [ethereumResult, arbitrumResult] = await Promise.all([
        fetchNFTPosition('ethereum', '12345'),
        fetchNFTPosition('arbitrum', '54321'),
      ]);

      expect(ethereumResult.chainName).toBe('ethereum');
      expect(arbitrumResult.chainName).toBe('arbitrum');
      expect(mockPublicClient.readContract).toHaveBeenCalledTimes(2);
    });
  });
});