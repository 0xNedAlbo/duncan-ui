/**
 * Comprehensive viem mocking setup
 * This file provides a complete mock replacement for viem's blockchain interaction functions
 */

import { vi } from 'vitest';
import { createMockPublicClient } from './blockchainProvider';
import { contractMocks } from './contractMocks';
import { chainConfigs } from './chainConfigs';

/**
 * Global viem mock setup
 * This replaces all viem functions with mock implementations
 */
export function setupViemMocks() {
  // Mock the entire viem module
  vi.mock('viem', async () => {
    const actual = await vi.importActual('viem');
    
    return {
      ...actual,
      
      // Mock createPublicClient to return our mock client
      createPublicClient: vi.fn((config: any) => {
        // Determine chain from config
        let chain: 'ethereum' | 'arbitrum' | 'base' = 'ethereum';
        
        if (config.chain?.id === 42161 || config.chain?.name?.toLowerCase().includes('arbitrum')) {
          chain = 'arbitrum';
        } else if (config.chain?.id === 8453 || config.chain?.name?.toLowerCase().includes('base')) {
          chain = 'base';
        } else if (config.chain?.id === 1 || config.chain?.name?.toLowerCase().includes('ethereum')) {
          chain = 'ethereum';
        }
        
        return createMockPublicClient({ chain });
      }),
      
      // Mock readContract as a standalone function
      readContract: vi.fn(async (client: any, params: any) => {
        // Extract chain from client or default to ethereum
        const chain = client?.chain?.name?.toLowerCase() || 'ethereum';
        const supportedChain = (['ethereum', 'arbitrum', 'base'] as const).includes(chain as any) 
          ? chain as 'ethereum' | 'arbitrum' | 'base'
          : 'ethereum';
        
        // Use the mock client's readContract method
        const mockClient = createMockPublicClient({ chain: supportedChain });
        return mockClient.readContract(params);
      }),
      
      // Mock other commonly used viem functions
      getContract: vi.fn((params: any) => {
        return {
          address: params.address,
          abi: params.abi,
          publicClient: params.publicClient,
          // Mock contract methods dynamically
          read: {
            // Common ERC20 methods
            name: vi.fn(() => 'Mock Token'),
            symbol: vi.fn(() => 'MOCK'),
            decimals: vi.fn(() => 18),
            totalSupply: vi.fn(() => BigInt('1000000000000000000000000')),
            balanceOf: vi.fn(() => BigInt('1000000000000000000')),
            
            // Uniswap V3 Factory methods
            getPool: vi.fn((token0: string, token1: string, fee: number) => {
              return contractMocks.factory.getPool('ethereum', token0, token1, fee);
            }),
            
            // Uniswap V3 Pool methods  
            slot0: vi.fn(() => contractMocks.pool.slot0('ethereum', params.address)),
            liquidity: vi.fn(() => contractMocks.pool.liquidity('ethereum', params.address)),
            token0: vi.fn(() => contractMocks.pool.token0('ethereum', params.address)),
            token1: vi.fn(() => contractMocks.pool.token1('ethereum', params.address)),
            fee: vi.fn(() => contractMocks.pool.fee('ethereum', params.address)),
            
            // NFT Position Manager methods
            positions: vi.fn((tokenId: string) => 
              contractMocks.nftPositionManager.positions('ethereum', tokenId)
            ),
            ownerOf: vi.fn((tokenId: string) => 
              contractMocks.nftPositionManager.ownerOf('ethereum', tokenId)
            ),
          },
        };
      }),
      
      // Mock address utilities
      isAddress: vi.fn((address: string) => {
        return typeof address === 'string' && 
               address.startsWith('0x') && 
               address.length === 42;
      }),
      
      getAddress: vi.fn((address: string) => {
        return address.toLowerCase();
      }),
      
      // Mock encoding/decoding functions
      encodeFunctionData: vi.fn((params: any) => '0x' + '0'.repeat(64)),
      decodeFunctionResult: vi.fn((params: any) => []),
      
      // Mock transport functions
      http: vi.fn((url?: string) => ({
        type: 'http',
        url: url || 'http://localhost:8545',
        request: vi.fn(),
      })),
      
      // Mock custom transport
      custom: vi.fn(() => ({
        type: 'custom',
        request: vi.fn(),
      })),
      
      // Mock formatters
      formatEther: vi.fn((value: bigint) => (Number(value) / 1e18).toString()),
      formatUnits: vi.fn((value: bigint, decimals: number) => {
        return (Number(value) / Math.pow(10, decimals)).toString();
      }),
      parseEther: vi.fn((value: string) => BigInt(Math.floor(parseFloat(value) * 1e18))),
      parseUnits: vi.fn((value: string, decimals: number) => {
        return BigInt(Math.floor(parseFloat(value) * Math.pow(10, decimals)));
      }),
      
      // Mock error classes
      ContractFunctionExecutionError: class extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'ContractFunctionExecutionError';
        }
      },
      
      CallExecutionError: class extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CallExecutionError';
        }
      },
    };
  });
  
  // Mock viem/chains
  vi.mock('viem/chains', async () => {
    const actual = await vi.importActual('viem/chains');
    return {
      ...actual,
      // Ensure chains are properly mocked
      mainnet: {
        id: 1,
        name: 'Ethereum',
        network: 'homestead',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: ['https://mainnet.infura.io'] } },
      },
      arbitrum: {
        id: 42161,
        name: 'Arbitrum One',
        network: 'arbitrum',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: ['https://arb1.arbitrum.io/rpc'] } },
      },
      base: {
        id: 8453,
        name: 'Base',
        network: 'base',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: ['https://mainnet.base.org'] } },
      },
    };
  });
}

/**
 * Legacy mock functions for backward compatibility
 * These are used by existing tests that haven't been updated to use the new mock system
 */
export const mockViemCalls = {
  // Mock Factory.getPool() calls
  mockGetPool: (token0: string, token1: string, fee: number): string => {
    return contractMocks.factory.getPool('ethereum', token0, token1, fee);
  },

  // Mock Pool.slot0() calls
  mockSlot0: (poolAddress: string) => {
    return contractMocks.pool.slot0('ethereum', poolAddress);
  },

  // Mock Pool.liquidity() calls
  mockLiquidity: (poolAddress: string): bigint => {
    return contractMocks.pool.liquidity('ethereum', poolAddress);
  },

  // Mock Pool.token0() calls
  mockToken0: (poolAddress: string): string => {
    return contractMocks.pool.token0('ethereum', poolAddress);
  },

  // Mock Pool.token1() calls
  mockToken1: (poolAddress: string): string => {
    return contractMocks.pool.token1('ethereum', poolAddress);
  },

  // Mock Pool.fee() calls
  mockFee: (poolAddress: string): number => {
    return contractMocks.pool.fee('ethereum', poolAddress);
  },

  // Mock Pool.tickSpacing() calls
  mockTickSpacing: (poolAddress: string): number => {
    return contractMocks.pool.tickSpacing('ethereum', poolAddress);
  },

  // Mock ERC20 token calls
  mockTokenName: (address: string): string => {
    return contractMocks.erc20.name('ethereum', address);
  },

  mockTokenSymbol: (address: string): string => {
    return contractMocks.erc20.symbol('ethereum', address);
  },

  mockTokenDecimals: (address: string): number => {
    return contractMocks.erc20.decimals('ethereum', address);
  },
};

/**
 * Utility functions for test setup
 */
export function getViemMockConfig(chain: 'ethereum' | 'arbitrum' | 'base' = 'ethereum') {
  return {
    chainConfig: chainConfigs[chain],
    contractMocks,
    createMockClient: () => createMockPublicClient({ chain }),
  };
}

/**
 * Reset all viem mocks
 * Call this in test cleanup
 */
export function resetViemMocks() {
  vi.clearAllMocks();
}