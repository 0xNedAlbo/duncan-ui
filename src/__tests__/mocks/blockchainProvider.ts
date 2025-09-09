import { PublicClient } from 'viem';
import { contractMocks } from './contractMocks';
import { chainConfigs } from './chainConfigs';

/**
 * Mock blockchain provider for testing
 * Provides deterministic responses for all blockchain interactions
 */

export interface MockPublicClientOptions {
  chain: 'ethereum' | 'arbitrum' | 'base';
  rpcUrl?: string;
}

/**
 * Creates a mock PublicClient that returns predefined responses
 * instead of making real blockchain calls
 */
export function createMockPublicClient(options: MockPublicClientOptions): PublicClient {
  const { chain } = options;
  const chainConfig = chainConfigs[chain];

  // Create a mock client that implements the PublicClient interface
  const mockClient = {
    // Core properties
    chain: chainConfig.viemChain,
    transport: { url: `mock://${chain}` },
    mode: 'mockClient' as const,
    
    // Mock readContract implementation
    readContract: async (params: any) => {
      const { address, functionName, args = [] } = params;
      
      try {
        // Route to appropriate contract mock based on address
        if (address === chainConfig.contracts.uniswapV3Factory) {
          return contractMocks.factory[functionName as keyof typeof contractMocks.factory](chain, ...args);
        }
        
        if (address === chainConfig.contracts.nftPositionManager) {
          return contractMocks.nftPositionManager[functionName as keyof typeof contractMocks.nftPositionManager](chain, ...args);
        }
        
        // Check if it's a pool address
        const isPoolAddress = chainConfig.pools.some(pool => 
          pool.address.toLowerCase() === address.toLowerCase()
        );
        
        if (isPoolAddress) {
          return contractMocks.pool[functionName as keyof typeof contractMocks.pool](chain, address, ...args);
        }
        
        // Check if it's a token address
        const tokenConfig = chainConfig.tokens.find(token => 
          token.address.toLowerCase() === address.toLowerCase()
        );
        
        if (tokenConfig) {
          return contractMocks.erc20[functionName as keyof typeof contractMocks.erc20](chain, address, ...args);
        }
        
        // Unknown address - return appropriate error
        throw new Error(`Contract not found at address ${address}`);
        
      } catch (error) {
        // Provide helpful error messages for debugging
        if (error instanceof Error) {
          throw new Error(`MockPublicClient[${chain}].readContract failed: ${error.message}`);
        }
        throw error;
      }
    },

    // Mock other methods as needed
    getBlockNumber: async () => BigInt(chainConfig.mockBlockNumber),
    
    getBalance: async (params: any) => {
      // Return mock balance for test accounts
      const { address } = params;
      if (address === chainConfig.testWallet.address) {
        return BigInt(chainConfig.testWallet.balance);
      }
      return BigInt(0);
    },
    
    // Add other methods as needed by tests
    call: async (params: any) => {
      // Delegate to readContract for contract calls
      if (params.data) {
        // This would need ABI decoding in a real scenario
        // For now, assume it's handled by readContract
        return params.data;
      }
      return '0x';
    },
    
    // Minimal implementation for other required PublicClient methods
    request: async (params: any) => {
      throw new Error(`MockPublicClient.request not implemented for: ${JSON.stringify(params)}`);
    },
    
  } as unknown as PublicClient;

  return mockClient;
}

/**
 * Global mock setup for viem's createPublicClient
 * This replaces the real createPublicClient with our mock version
 */
export function setupMockPublicClient() {
  const vi = (globalThis as any).vi;
  
  if (!vi) {
    throw new Error('setupMockPublicClient must be called within a vitest environment');
  }

  // Mock the viem createPublicClient function
  vi.mock('viem', async () => {
    const actual = await vi.importActual('viem');
    
    return {
      ...actual,
      createPublicClient: vi.fn((config: any) => {
        // Determine chain from config
        const chain = config.chain?.name?.toLowerCase() || 'ethereum';
        const supportedChain = (['ethereum', 'arbitrum', 'base'] as const).includes(chain as any) 
          ? chain as 'ethereum' | 'arbitrum' | 'base'
          : 'ethereum';
          
        return createMockPublicClient({ chain: supportedChain });
      }),
    };
  });
}

/**
 * Helper to get chain-specific test data
 */
export function getChainTestData(chain: 'ethereum' | 'arbitrum' | 'base') {
  return chainConfigs[chain];
}