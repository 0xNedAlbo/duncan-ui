/**
 * Uniswap V3 Factory Contract ABI and utilities
 * Used for pool address computation and factory interactions
 */

export const UNISWAP_V3_FACTORY_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "", "type": "address"},
      {"internalType": "address", "name": "", "type": "address"},
      {"internalType": "uint24", "name": "", "type": "uint24"}
    ],
    "name": "getPool",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint24", "name": "", "type": "uint24"}
    ],
    "name": "feeAmountTickSpacing",
    "outputs": [{"internalType": "int24", "name": "", "type": "int24"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Uniswap V3 Factory addresses on different chains
export const UNISWAP_V3_FACTORY_ADDRESSES: Record<string, `0x${string}`> = {
  ethereum: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  arbitrum: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  base: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
};

// Chain ID mapping
export function getChainId(chainName: string): number {
  const chainIds: Record<string, number> = {
    ethereum: 1,
    arbitrum: 42161,
    base: 8453,
  };

  const chainId = chainIds[chainName.toLowerCase()];
  if (!chainId) {
    throw new Error(`Unsupported chain: ${chainName}`);
  }

  return chainId;
}

// Fee tier to tick spacing mapping
export function getTickSpacing(fee: number): number {
  const feeToTickSpacing: Record<number, number> = {
    100: 1,     // 0.01%
    500: 10,    // 0.05%
    3000: 60,   // 0.3%
    10000: 200, // 1%
  };

  const tickSpacing = feeToTickSpacing[fee];
  if (tickSpacing === undefined) {
    throw new Error(`Invalid fee tier: ${fee}. Supported: 100, 500, 3000, 10000`);
  }

  return tickSpacing;
}

// Supported fee tiers
export const SUPPORTED_FEE_TIERS = [100, 500, 3000, 10000] as const;

export function isValidFeeTier(fee: number): boolean {
  return SUPPORTED_FEE_TIERS.includes(fee as any);
}

export function formatFeePercentage(fee: number): string {
  return `${(fee / 10000).toFixed(2)}%`;
}