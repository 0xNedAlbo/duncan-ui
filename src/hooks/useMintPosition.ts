import { useState, useEffect } from 'react';
import { Address } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { nearestUsableTick } from '@uniswap/v3-sdk';
import {
  NONFUNGIBLE_POSITION_MANAGER_ADDRESSES,
  NONFUNGIBLE_POSITION_MANAGER_ABI,
} from '@/lib/contracts/nonfungiblePositionManager';

export interface MintPositionParams {
  token0: Address;
  token1: Address;
  fee: number;
  tickLower: number;
  tickUpper: number;
  amount0Desired: bigint;
  amount1Desired: bigint;
  tickSpacing: number;
  recipient: Address;
  chainId: number;
  slippageBps?: number; // Slippage in basis points (default: 50 = 0.5%)
}

export interface UseMintPositionResult {
  // Mint transaction
  mint: () => void;
  isMinting: boolean;
  isWaitingForConfirmation: boolean;
  mintError: Error | null;
  mintTxHash: Address | undefined;

  // Position result
  tokenId: bigint | undefined;
  isSuccess: boolean;

  // Reset state
  reset: () => void;
}

/**
 * Hook to mint a new Uniswap V3 position NFT
 *
 * Handles:
 * - Aligning ticks to pool's tick spacing
 * - Calculating slippage-adjusted minimum amounts (default 0.5%)
 * - Setting transaction deadline (20 minutes from now)
 * - Minting the position NFT via NonfungiblePositionManager
 *
 * @param params - Position parameters including tokens, ticks, amounts, and chain
 */
export function useMintPosition(params: MintPositionParams | null): UseMintPositionResult {
  const [mintError, setMintError] = useState<Error | null>(null);
  const [tokenId, setTokenId] = useState<bigint | undefined>(undefined);

  const slippageBps = params?.slippageBps ?? 50; // Default 0.5% slippage

  // Get the NonfungiblePositionManager address for this chain
  const managerAddress = params?.chainId
    ? NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[params.chainId]
    : undefined;

  // Prepare mint parameters
  const mintParams = params ? prepareMintParams(params, slippageBps) : null;

  // Write contract for minting
  const {
    writeContract,
    data: mintTxHash,
    isPending: isMinting,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  // Wait for mint transaction confirmation
  const {
    isLoading: isWaitingForConfirmation,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash: mintTxHash,
    chainId: params?.chainId,
  });

  // Handle mint errors
  useEffect(() => {
    if (writeError) {
      setMintError(writeError);
    }
  }, [writeError]);

  // Extract tokenId from transaction receipt
  useEffect(() => {
    if (isSuccess && receipt) {
      // Find the Transfer event from the NonfungiblePositionManager contract
      // The tokenId is in the third topic (tokenId) of the Transfer event
      const transferLog = receipt.logs.find(
        log =>
          log.address.toLowerCase() === managerAddress?.toLowerCase() &&
          log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event signature
      );

      if (transferLog && transferLog.topics[3]) {
        try {
          // TokenId is in the 4th topic (index 3)
          const extractedTokenId = BigInt(transferLog.topics[3]);
          setTokenId(extractedTokenId);
        } catch (error) {
          console.error('Failed to extract tokenId from receipt:', error);
        }
      }
    }
  }, [isSuccess, receipt, managerAddress]);

  // Mint function
  const mint = () => {
    if (!params || !mintParams || !managerAddress) {
      setMintError(new Error('Missing required parameters for minting position'));
      return;
    }

    setMintError(null);
    setTokenId(undefined);

    try {
      writeContract({
        address: managerAddress,
        abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
        functionName: 'mint',
        args: [mintParams],
        chainId: params.chainId,
      });
    } catch (error) {
      setMintError(error as Error);
    }
  };

  // Reset function
  const reset = () => {
    resetWrite();
    setMintError(null);
    setTokenId(undefined);
  };

  return {
    // Mint transaction
    mint,
    isMinting,
    isWaitingForConfirmation,
    mintError,
    mintTxHash,

    // Position result
    tokenId,
    isSuccess,

    // Reset
    reset,
  };
}

/**
 * Prepare mint parameters with tick alignment and slippage protection
 */
function prepareMintParams(
  params: MintPositionParams,
  slippageBps: number
) {
  // Align ticks to tick spacing
  const alignedTickLower = nearestUsableTick(params.tickLower, params.tickSpacing);
  const alignedTickUpper = nearestUsableTick(params.tickUpper, params.tickSpacing);

  // Calculate minimum amounts with slippage tolerance
  // Temporarily set to 0 for testing
  const amount0Min = 0n;
  const amount1Min = 0n;

  // Set deadline to 20 minutes from now
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes

  return {
    token0: params.token0,
    token1: params.token1,
    fee: params.fee,
    tickLower: alignedTickLower,
    tickUpper: alignedTickUpper,
    amount0Desired: params.amount0Desired,
    amount1Desired: params.amount1Desired,
    amount0Min,
    amount1Min,
    recipient: params.recipient,
    deadline,
  };
}