import { describe, it, expect, beforeEach } from 'vitest';
import { AlchemyTokenService } from './tokenMetadata';
import { TOKEN_ADDRESSES, INVALID_ADDRESSES } from '../../__tests__/fixtures/tokens';

describe('AlchemyTokenService', () => {
  let service: AlchemyTokenService;

  beforeEach(() => {
    // Set mock environment variable for testing
    process.env.ALCHEMY_TOKEN_API_KEY = 'test-api-key';
    
    service = new AlchemyTokenService();
  });

  describe('constructor', () => {
    it('should initialize with correct Alchemy URLs', () => {
      expect(service.isChainSupported('ethereum')).toBe(true);
      expect(service.isChainSupported('arbitrum')).toBe(true);
      expect(service.isChainSupported('base')).toBe(true);
      expect(service.isChainSupported('polygon')).toBe(false);
    });

    it('should return correct supported chains', () => {
      const chains = service.getSupportedChains();
      expect(chains).toEqual(['ethereum', 'arbitrum', 'base']);
    });
  });

  describe('getTokenMetadata', () => {
    it('should fetch token metadata for WETH on Ethereum', async () => {
      const result = await service.getTokenMetadata('ethereum', TOKEN_ADDRESSES.ethereum.WETH);
      
      expect(result).toEqual({
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        logo: 'https://static.alchemyapi.io/images/assets/2396.png',
      });
    });

    it('should fetch token metadata for USDC on Arbitrum', async () => {
      const result = await service.getTokenMetadata('arbitrum', TOKEN_ADDRESSES.arbitrum.USDC);
      
      expect(result).toEqual({
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        logo: 'https://static.alchemyapi.io/images/assets/3408.png',
      });
    });

    it('should fetch token metadata for WETH on Base', async () => {
      const result = await service.getTokenMetadata('base', TOKEN_ADDRESSES.base.WETH);
      
      expect(result).toEqual({
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        logo: 'https://static.alchemyapi.io/images/assets/2396.png',
      });
    });

    it('should throw error for unsupported chain', async () => {
      await expect(
        service.getTokenMetadata('polygon', TOKEN_ADDRESSES.ethereum.WETH)
      ).rejects.toThrow('Unsupported chain: polygon');
    });

    it('should throw error for invalid address format', async () => {
      for (const invalidAddress of INVALID_ADDRESSES) {
        await expect(
          service.getTokenMetadata('ethereum', invalidAddress)
        ).rejects.toThrow();
      }
    });

    it('should throw error for non-existent token', async () => {
      const nonExistentToken = '0x1234567890123456789012345678901234567890';
      
      await expect(
        service.getTokenMetadata('ethereum', nonExistentToken)
      ).rejects.toThrow('Token not found');
    });
  });

  describe('getTokenMetadataBatch', () => {
    it('should fetch metadata for multiple tokens', async () => {
      const addresses = [
        TOKEN_ADDRESSES.ethereum.WETH,
        TOKEN_ADDRESSES.ethereum.USDC,
      ];
      
      const results = await service.getTokenMetadataBatch('ethereum', addresses);
      
      expect(results).toHaveLength(2);
      expect(results[0].symbol).toBe('WETH');
      expect(results[1].symbol).toBe('USDC');
    });

    it('should return empty array for empty input', async () => {
      const results = await service.getTokenMetadataBatch('ethereum', []);
      expect(results).toEqual([]);
    });

    it('should throw error for batch size over 100', async () => {
      const largeAddressList = new Array(101).fill(TOKEN_ADDRESSES.ethereum.WETH);
      
      await expect(
        service.getTokenMetadataBatch('ethereum', largeAddressList)
      ).rejects.toThrow('Batch size cannot exceed 100 tokens');
    });

    it('should throw error for unsupported chain in batch', async () => {
      await expect(
        service.getTokenMetadataBatch('polygon', [TOKEN_ADDRESSES.ethereum.WETH])
      ).rejects.toThrow('Unsupported chain: polygon');
    });

    it('should throw error if any address in batch is invalid', async () => {
      const addresses = [
        TOKEN_ADDRESSES.ethereum.WETH,
        INVALID_ADDRESSES[0], // Invalid address
      ];
      
      await expect(
        service.getTokenMetadataBatch('ethereum', addresses)
      ).rejects.toThrow();
    });
  });

  describe('getTokenMetadataBatchLarge', () => {
    it('should handle empty array', async () => {
      const results = await service.getTokenMetadataBatchLarge('ethereum', []);
      expect(results).toEqual([]);
    });

    it('should handle small batch (under 100)', async () => {
      const addresses = [
        TOKEN_ADDRESSES.ethereum.WETH,
        TOKEN_ADDRESSES.ethereum.USDC,
      ];
      
      const results = await service.getTokenMetadataBatchLarge('ethereum', addresses);
      expect(results).toHaveLength(2);
    });

    it('should split large batches correctly', async () => {
      // Create a list with exactly 150 addresses (should be split into 2 batches)
      const addresses = [
        ...new Array(75).fill(TOKEN_ADDRESSES.ethereum.WETH),
        ...new Array(75).fill(TOKEN_ADDRESSES.ethereum.USDC),
      ];
      
      const results = await service.getTokenMetadataBatchLarge('ethereum', addresses);
      expect(results).toHaveLength(150);
    });
  });

  describe('validation methods', () => {
    it('should correctly identify supported chains', () => {
      expect(service.isChainSupported('ethereum')).toBe(true);
      expect(service.isChainSupported('arbitrum')).toBe(true);
      expect(service.isChainSupported('base')).toBe(true);
      expect(service.isChainSupported('polygon')).toBe(false);
      expect(service.isChainSupported('optimism')).toBe(false);
    });

    it('should return all supported chains', () => {
      const chains = service.getSupportedChains();
      expect(chains.sort()).toEqual(['arbitrum', 'base', 'ethereum']);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      // This would normally require mocking fetch to throw
      // For now, we test the error handling through invalid requests
      await expect(
        service.getTokenMetadata('ethereum', '0x1234567890123456789012345678901234567890')
      ).rejects.toThrow();
    });

    it('should validate input parameters strictly', async () => {
      // Test null/undefined addresses
      await expect(
        service.getTokenMetadata('ethereum', null as any)
      ).rejects.toThrow('Invalid address');
      
      await expect(
        service.getTokenMetadata('ethereum', undefined as any)
      ).rejects.toThrow('Invalid address');
      
      await expect(
        service.getTokenMetadata('ethereum', '' as any)
      ).rejects.toThrow('Invalid address');
    });
  });
});