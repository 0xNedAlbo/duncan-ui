import { Address } from 'viem';
import { normalizeAddress } from '@/lib/utils/evm';

// Contract addresses for Uniswap V3 NonfungiblePositionManager (EIP-55 checksummed)
export const NONFUNGIBLE_POSITION_MANAGER_ADDRESSES: Record<number, Address> = {
  // Ethereum Mainnet
  1: normalizeAddress('0xC36442b4a4522E871399CD717aBDD847Ab11FE88') as Address,
  // Arbitrum One
  42161: normalizeAddress('0xC36442b4a4522E871399CD717aBDD847Ab11FE88') as Address,
  // Base
  8453: normalizeAddress('0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1') as Address,
};

// ABI for the positions() and ownerOf() functions
export const NONFUNGIBLE_POSITION_MANAGER_ABI = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'positions',
    outputs: [
      {
        internalType: 'uint96',
        name: 'nonce',
        type: 'uint96',
      },
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'token0',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'token1',
        type: 'address',
      },
      {
        internalType: 'uint24',
        name: 'fee',
        type: 'uint24',
      },
      {
        internalType: 'int24',
        name: 'tickLower',
        type: 'int24',
      },
      {
        internalType: 'int24',
        name: 'tickUpper',
        type: 'int24',
      },
      {
        internalType: 'uint128',
        name: 'liquidity',
        type: 'uint128',
      },
      {
        internalType: 'uint256',
        name: 'feeGrowthInside0LastX128',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'feeGrowthInside1LastX128',
        type: 'uint256',
      },
      {
        internalType: 'uint128',
        name: 'tokensOwed0',
        type: 'uint128',
      },
      {
        internalType: 'uint128',
        name: 'tokensOwed1',
        type: 'uint128',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'ownerOf',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Types for the position data
export interface NFTPosition {
  nonce: bigint;
  operator: Address;
  token0: Address;
  token1: Address;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  feeGrowthInside0LastX128: bigint;
  feeGrowthInside1LastX128: bigint;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
}

// Helper to get chain name from chain ID
export function getChainName(chainId: number): string {
  switch (chainId) {
    case 1:
      return 'ethereum';
    case 42161:
      return 'arbitrum';
    case 8453:
      return 'base';
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

// Helper to get chain ID from chain name
export function getChainId(chainName: string): number {
  switch (chainName.toLowerCase()) {
    case 'ethereum':
      return 1;
    case 'arbitrum':
      return 42161;
    case 'base':
      return 8453;
    default:
      throw new Error(`Unsupported chain: ${chainName}`);
  }
}