import { createPublicClient, http } from 'viem';
import { mainnet, arbitrum, base } from 'viem/chains';
import {
  NONFUNGIBLE_POSITION_MANAGER_ADDRESSES,
  NONFUNGIBLE_POSITION_MANAGER_ABI,
  NFTPosition,
  getChainId,
} from '@/lib/contracts/nonfungiblePositionManager';

// Chain configuration
const CHAIN_CONFIG = {
  1: { chain: mainnet },
  42161: { chain: arbitrum },
  8453: { chain: base },
};

export interface ParsedNFTPosition {
  nftId: string;
  chainId: number;
  chainName: string;
  token0Address: string;
  token1Address: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  tokensOwed0: string;
  tokensOwed1: string;
  isActive: boolean;
}

export async function fetchNFTPosition(
  chainName: string,
  nftId: string
): Promise<ParsedNFTPosition> {
  const chainId = getChainId(chainName);
  const contractAddress = NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId];
  
  if (!contractAddress) {
    throw new Error(`NonfungiblePositionManager not deployed on chain ${chainName}`);
  }

  const chainConfig = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG];
  if (!chainConfig) {
    throw new Error(`Unsupported chain: ${chainName}`);
  }

  // Create public client for the specific chain
  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(),
  });

  try {
    // Call the positions() function on the contract
    const positionData = await publicClient.readContract({
      address: contractAddress,
      abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
      functionName: 'positions',
      args: [BigInt(nftId)],
    }) as [bigint, string, string, string, number, number, number, bigint, bigint, bigint, bigint, bigint];

    // Parse the returned data
    const [
      nonce,
      operator,
      token0,
      token1,
      fee,
      tickLower,
      tickUpper,
      liquidity,
      feeGrowthInside0LastX128,
      feeGrowthInside1LastX128,
      tokensOwed0,
      tokensOwed1,
    ] = positionData;

    // Check if position exists (liquidity > 0 means active position)
    const isActive = liquidity > 0n;

    return {
      nftId,
      chainId,
      chainName,
      token0Address: token0,
      token1Address: token1,
      fee,
      tickLower,
      tickUpper,
      liquidity: liquidity.toString(),
      tokensOwed0: tokensOwed0.toString(),
      tokensOwed1: tokensOwed1.toString(),
      isActive,
    };
  } catch (error) {
    console.error('Error fetching NFT position:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('execution reverted')) {
        throw new Error(`NFT with ID ${nftId} does not exist on ${chainName}`);
      }
      if (error.message.includes('network')) {
        throw new Error(`Network error while fetching position from ${chainName}`);
      }
    }
    
    throw new Error(`Failed to fetch NFT position: ${error}`);
  }
}

export async function validateNFTExists(
  chainName: string,
  nftId: string
): Promise<boolean> {
  try {
    await fetchNFTPosition(chainName, nftId);
    return true;
  } catch (error) {
    return false;
  }
}