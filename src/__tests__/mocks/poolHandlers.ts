import { http, HttpResponse } from 'msw';
import { mockTokens } from '../fixtures/tokens';
import { mockPools, mockUserTokens, mockFactoryResponses } from '../fixtures/pools';

/**
 * MSW handlers for Pool-related external API calls
 * Mocks Uniswap V3 Factory and Pool contract calls
 */

export const poolHandlers = [
  // Mock contract calls for different chains
  // These would normally be handled by viem, but we mock them for testing
  
  // Mock Factory getPool calls
  http.post('*', ({ request }) => {
    // This is a simplified mock - in reality, viem makes JSON-RPC calls
    // We'll handle this in the test setup by mocking viem functions directly
    return new HttpResponse(null, { status: 200 });
  }),
];

/**
 * Mock functions for viem contract calls
 * These will be used in tests to mock blockchain interactions
 */

export const mockViemCalls = {
  // Mock Factory.getPool() calls
  mockGetPool: (token0: string, token1: string, fee: number): string => {
    const key = `${token0.toLowerCase()}_${token1.toLowerCase()}_${fee}`;
    
    // Return known pool addresses for test tokens
    if (key.includes('c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') && 
        key.includes('a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')) {
      if (fee === 3000) return mockFactoryResponses.WETH_USDC_3000;
      if (fee === 500) return mockFactoryResponses.WETH_USDC_500;
    }
    
    // Custom token with USDC
    if (key.includes('0123456789012345678901234567890123456789') && 
        key.includes('a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48') && 
        fee === 3000) {
      return '0x1234567890123456789012345678901234567890';
    }
    
    // Return zero address for non-existent pools
    return mockFactoryResponses.NON_EXISTENT;
  },

  // Mock Pool.slot0() calls
  mockSlot0: (poolAddress: string) => {
    if (poolAddress === mockFactoryResponses.WETH_USDC_3000) {
      return [
        BigInt('3543191142285914205922034323214'), // sqrtPriceX96
        202500,  // tick
        1,       // observationIndex
        1,       // observationCardinality
        1,       // observationCardinalityNext
        0,       // feeProtocol
        true,    // unlocked
      ];
    }
    if (poolAddress === '0x1234567890123456789012345678901234567890') {
      return [
        BigInt('3543191142285914205922034323214'), // sqrtPriceX96
        202500,  // tick
        1,       // observationIndex
        1,       // observationCardinality
        1,       // observationCardinalityNext
        0,       // feeProtocol
        true,    // unlocked
      ];
    }
    
    throw new Error('Pool not found');
  },

  // Mock Pool.liquidity() calls
  mockLiquidity: (poolAddress: string): bigint => {
    if (poolAddress === mockFactoryResponses.WETH_USDC_3000) {
      return BigInt('12345678901234567890');
    }
    if (poolAddress === '0x1234567890123456789012345678901234567890') {
      return BigInt('12345678901234567890');
    }
    
    throw new Error('Pool not found');
  },

  // Mock Pool.token0() calls
  mockToken0: (poolAddress: string): string => {
    if (poolAddress === mockFactoryResponses.WETH_USDC_3000) {
      return '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'; // USDC (lower address)
    }
    if (poolAddress === '0x1234567890123456789012345678901234567890') {
      return '0x0123456789012345678901234567890123456789'; // Custom token (lower)
    }
    
    throw new Error('Pool not found');
  },

  // Mock Pool.token1() calls  
  mockToken1: (poolAddress: string): string => {
    if (poolAddress === mockFactoryResponses.WETH_USDC_3000) {
      return '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH (higher address)
    }
    if (poolAddress === '0x1234567890123456789012345678901234567890') {
      return '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'; // USDC (higher)
    }
    
    throw new Error('Pool not found');
  },

  // Mock Pool.fee() calls
  mockFee: (poolAddress: string): number => {
    if (poolAddress === mockFactoryResponses.WETH_USDC_3000) {
      return 3000;
    }
    if (poolAddress === '0x1234567890123456789012345678901234567890') {
      return 3000;
    }
    
    throw new Error('Pool not found');
  },

  // Mock Pool.tickSpacing() calls
  mockTickSpacing: (poolAddress: string): number => {
    if (poolAddress === mockFactoryResponses.WETH_USDC_3000) {
      return 60;
    }
    if (poolAddress === '0x1234567890123456789012345678901234567890') {
      return 60;
    }
    
    throw new Error('Pool not found');
  },

  // Mock ERC-20 contract calls for tokens
  mockTokenName: (tokenAddress: string): string => {
    const address = tokenAddress.toLowerCase();
    if (address === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') return 'Wrapped Ether';
    if (address === '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48') return 'USD Coin';
    if (address === '0x0123456789012345678901234567890123456789') return 'Custom Test Token';
    if (address === '0xffffffffffffffffffffffffffffffffffffffff') {
      throw new Error('Contract call failed');
    }
    return 'Unknown Token';
  },

  mockTokenSymbol: (tokenAddress: string): string => {
    const address = tokenAddress.toLowerCase();
    if (address === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') return 'WETH';
    if (address === '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48') return 'USDC';
    if (address === '0x0123456789012345678901234567890123456789') return 'CUSTOM';
    if (address === '0xffffffffffffffffffffffffffffffffffffffff') {
      throw new Error('Contract call failed');
    }
    return 'UNKNOWN';
  },

  mockTokenDecimals: (tokenAddress: string): number => {
    const address = tokenAddress.toLowerCase();
    if (address === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') return 18; // WETH
    if (address === '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48') return 6;  // USDC
    if (address === '0x0123456789012345678901234567890123456789') return 18; // Custom
    if (address === '0xffffffffffffffffffffffffffffffffffffffff') {
      throw new Error('Contract call failed');
    }
    return 18; // Default
  },
};