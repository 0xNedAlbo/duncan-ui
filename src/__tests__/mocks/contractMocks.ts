/**
 * Comprehensive contract mocks for all Uniswap V3 and ERC20 interactions
 * Provides deterministic responses for blockchain contract calls
 */

import { chainConfigs } from './chainConfigs';

/**
 * Mock responses for Uniswap V3 Factory contract
 */
export const factoryMocks = {
  /**
   * Mock getPool(token0, token1, fee) calls
   * Returns deterministic pool addresses for known token pairs
   */
  getPool: (chain: string, token0: string, token1: string, fee: number): string => {
    const chainConfig = chainConfigs[chain as keyof typeof chainConfigs];
    if (!chainConfig) return '0x0000000000000000000000000000000000000000';

    // Normalize addresses for comparison
    const addr0 = token0.toLowerCase();
    const addr1 = token1.toLowerCase();
    
    // Find matching pool in chain configuration
    const pool = chainConfig.pools.find(p => {
      const poolToken0 = p.token0.toLowerCase();
      const poolToken1 = p.token1.toLowerCase();
      
      // Check both orderings since Uniswap sorts tokens by address
      return (
        (poolToken0 === addr0 && poolToken1 === addr1 && p.fee === fee) ||
        (poolToken0 === addr1 && poolToken1 === addr0 && p.fee === fee)
      );
    });

    return pool?.address || '0x0000000000000000000000000000000000000000';
  },

  /**
   * Mock owner() calls
   */
  owner: (chain: string) => {
    const chainConfig = chainConfigs[chain as keyof typeof chainConfigs];
    return chainConfig?.contracts.factoryOwner || '0x0000000000000000000000000000000000000000';
  },
};

/**
 * Mock responses for Uniswap V3 Pool contracts
 */
export const poolMocks = {
  /**
   * Mock slot0() calls - returns pool's current state
   */
  slot0: (chain: string, poolAddress: string) => {
    const chainConfig = chainConfigs[chain as keyof typeof chainConfigs];
    if (!chainConfig) throw new Error(`Unknown chain: ${chain}`);

    const pool = chainConfig.pools.find(p => 
      p.address.toLowerCase() === poolAddress.toLowerCase()
    );

    if (!pool) {
      throw new Error(`Pool not found: ${poolAddress}`);
    }

    return [
      BigInt(pool.sqrtPriceX96),     // sqrtPriceX96
      pool.tick,                      // tick
      pool.observationIndex,          // observationIndex
      pool.observationCardinality,    // observationCardinality
      pool.observationCardinalityNext,// observationCardinalityNext
      pool.feeProtocol,               // feeProtocol
      pool.unlocked,                  // unlocked
    ];
  },

  /**
   * Mock liquidity() calls
   */
  liquidity: (chain: string, poolAddress: string): bigint => {
    const chainConfig = chainConfigs[chain as keyof typeof chainConfigs];
    if (!chainConfig) throw new Error(`Unknown chain: ${chain}`);

    const pool = chainConfig.pools.find(p => 
      p.address.toLowerCase() === poolAddress.toLowerCase()
    );

    if (!pool) {
      throw new Error(`Pool not found: ${poolAddress}`);
    }

    return BigInt(pool.liquidity);
  },

  /**
   * Mock token0() calls
   */
  token0: (chain: string, poolAddress: string): string => {
    const chainConfig = chainConfigs[chain as keyof typeof chainConfigs];
    if (!chainConfig) throw new Error(`Unknown chain: ${chain}`);

    const pool = chainConfig.pools.find(p => 
      p.address.toLowerCase() === poolAddress.toLowerCase()
    );

    if (!pool) {
      throw new Error(`Pool not found: ${poolAddress}`);
    }

    return pool.token0;
  },

  /**
   * Mock token1() calls
   */
  token1: (chain: string, poolAddress: string): string => {
    const chainConfig = chainConfigs[chain as keyof typeof chainConfigs];
    if (!chainConfig) throw new Error(`Unknown chain: ${chain}`);

    const pool = chainConfig.pools.find(p => 
      p.address.toLowerCase() === poolAddress.toLowerCase()
    );

    if (!pool) {
      throw new Error(`Pool not found: ${poolAddress}`);
    }

    return pool.token1;
  },

  /**
   * Mock fee() calls
   */
  fee: (chain: string, poolAddress: string): number => {
    const chainConfig = chainConfigs[chain as keyof typeof chainConfigs];
    if (!chainConfig) throw new Error(`Unknown chain: ${chain}`);

    const pool = chainConfig.pools.find(p => 
      p.address.toLowerCase() === poolAddress.toLowerCase()
    );

    if (!pool) {
      throw new Error(`Pool not found: ${poolAddress}`);
    }

    return pool.fee;
  },

  /**
   * Mock tickSpacing() calls
   */
  tickSpacing: (chain: string, poolAddress: string): number => {
    const chainConfig = chainConfigs[chain as keyof typeof chainConfigs];
    if (!chainConfig) throw new Error(`Unknown chain: ${chain}`);

    const pool = chainConfig.pools.find(p => 
      p.address.toLowerCase() === poolAddress.toLowerCase()
    );

    if (!pool) {
      throw new Error(`Pool not found: ${poolAddress}`);
    }

    return pool.tickSpacing;
  },
};

/**
 * Mock responses for ERC20 token contracts
 */
export const erc20Mocks = {
  /**
   * Mock name() calls
   */
  name: (chain: string, tokenAddress: string): string => {
    const chainConfig = chainConfigs[chain as keyof typeof chainConfigs];
    if (!chainConfig) throw new Error(`Unknown chain: ${chain}`);

    const token = chainConfig.tokens.find(t => 
      t.address.toLowerCase() === tokenAddress.toLowerCase()
    );

    if (!token) {
      throw new Error(`Token not found: ${tokenAddress}`);
    }

    return token.name;
  },

  /**
   * Mock symbol() calls
   */
  symbol: (chain: string, tokenAddress: string): string => {
    const chainConfig = chainConfigs[chain as keyof typeof chainConfigs];
    if (!chainConfig) throw new Error(`Unknown chain: ${chain}`);

    const token = chainConfig.tokens.find(t => 
      t.address.toLowerCase() === tokenAddress.toLowerCase()
    );

    if (!token) {
      throw new Error(`Token not found: ${tokenAddress}`);
    }

    return token.symbol;
  },

  /**
   * Mock decimals() calls
   */
  decimals: (chain: string, tokenAddress: string): number => {
    const chainConfig = chainConfigs[chain as keyof typeof chainConfigs];
    if (!chainConfig) throw new Error(`Unknown chain: ${chain}`);

    const token = chainConfig.tokens.find(t => 
      t.address.toLowerCase() === tokenAddress.toLowerCase()
    );

    if (!token) {
      throw new Error(`Token not found: ${tokenAddress}`);
    }

    return token.decimals;
  },

  /**
   * Mock totalSupply() calls
   */
  totalSupply: (chain: string, tokenAddress: string): bigint => {
    const chainConfig = chainConfigs[chain as keyof typeof chainConfigs];
    if (!chainConfig) throw new Error(`Unknown chain: ${chain}`);

    const token = chainConfig.tokens.find(t => 
      t.address.toLowerCase() === tokenAddress.toLowerCase()
    );

    if (!token) {
      throw new Error(`Token not found: ${tokenAddress}`);
    }

    return BigInt(token.totalSupply || '1000000000000000000000000'); // Default 1M tokens
  },

  /**
   * Mock balanceOf() calls
   */
  balanceOf: (chain: string, tokenAddress: string, account: string): bigint => {
    // Return mock balance for test accounts
    const chainConfig = chainConfigs[chain as keyof typeof chainConfigs];
    if (!chainConfig) return BigInt(0);

    if (account.toLowerCase() === chainConfig.testWallet.address.toLowerCase()) {
      return BigInt(chainConfig.testWallet.tokenBalance);
    }

    return BigInt(0);
  },
};

/**
 * Mock responses for NFT Position Manager contract
 */
export const nftPositionManagerMocks = {
  /**
   * Mock positions() calls - returns NFT position data
   */
  positions: (chain: string, tokenId: string) => {
    const chainConfig = chainConfigs[chain as keyof typeof chainConfigs];
    if (!chainConfig) throw new Error(`Unknown chain: ${chain}`);

    // Return mock position data for test NFT IDs
    const mockPositions: Record<string, any> = {
      '12345': {
        nonce: BigInt(0),
        operator: '0x0000000000000000000000000000000000000000',
        token0: chainConfig.tokens[0].address, // WETH
        token1: chainConfig.tokens[1].address, // USDC
        fee: 3000,
        tickLower: -887220,
        tickUpper: 887220,
        liquidity: BigInt('1000000000000000000'),
        feeGrowthInside0LastX128: BigInt(0),
        feeGrowthInside1LastX128: BigInt(0),
        tokensOwed0: BigInt('100000000000000000'), // 0.1 WETH
        tokensOwed1: BigInt('200000000'), // 200 USDC
      },
      '54321': {
        nonce: BigInt(1),
        operator: '0x0000000000000000000000000000000000000000',
        token0: chainConfig.tokens[0].address,
        token1: chainConfig.tokens[1].address,
        fee: 500,
        tickLower: -60,
        tickUpper: 60,
        liquidity: BigInt('500000000000000000'),
        feeGrowthInside0LastX128: BigInt(0),
        feeGrowthInside1LastX128: BigInt(0),
        tokensOwed0: BigInt('50000000000000000'),
        tokensOwed1: BigInt('100000000'),
      }
    };

    const position = mockPositions[tokenId];
    if (!position) {
      throw new Error(`NFT position not found: ${tokenId}`);
    }

    return [
      position.nonce,
      position.operator,
      position.token0,
      position.token1,
      position.fee,
      position.tickLower,
      position.tickUpper,
      position.liquidity,
      position.feeGrowthInside0LastX128,
      position.feeGrowthInside1LastX128,
      position.tokensOwed0,
      position.tokensOwed1,
    ];
  },

  /**
   * Mock ownerOf() calls
   */
  ownerOf: (chain: string, tokenId: string): string => {
    const chainConfig = chainConfigs[chain as keyof typeof chainConfigs];
    if (!chainConfig) throw new Error(`Unknown chain: ${chain}`);

    // Return test wallet as owner for all test NFTs
    return chainConfig.testWallet.address;
  },

  /**
   * Mock tokenURI() calls
   */
  tokenURI: (chain: string, tokenId: string): string => {
    return `https://nft.uniswap.org/${tokenId}`;
  },
};

/**
 * Combined contract mocks export
 */
export const contractMocks = {
  factory: factoryMocks,
  pool: poolMocks,
  erc20: erc20Mocks,
  nftPositionManager: nftPositionManagerMocks,
};