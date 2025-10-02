import { useState, useEffect } from 'react';
import { Address } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import {
  NONFUNGIBLE_POSITION_MANAGER_ADDRESSES,
  NONFUNGIBLE_POSITION_MANAGER_ABI,
} from '@/lib/contracts/nonfungiblePositionManager';

export interface CollectFeesParams {
  tokenId: bigint;
  recipient: Address;
  amount0Max: bigint;
  amount1Max: bigint;
  chainId: number;
}

export interface UseCollectFeesResult {
  // Collect transaction
  collect: () => void;
  isCollecting: boolean;
  isWaitingForConfirmation: boolean;
  collectError: Error | null;
  collectTxHash: Address | undefined;

  // Result
  collectedAmount0: bigint | undefined;
  collectedAmount1: bigint | undefined;
  isSuccess: boolean;

  // Reset state
  reset: () => void;
}

/**
 * Hook to collect fees from a Uniswap V3 position
 *
 * Handles:
 * - Collecting accumulated fees from NonfungiblePositionManager
 * - Setting max amounts to collect all available fees
 * - Extracting collected amounts from transaction receipt
 *
 * @param params - Position parameters including tokenId, recipient, amounts, and chain
 */
export function useCollectFees(params: CollectFeesParams | null): UseCollectFeesResult {
  const [collectError, setCollectError] = useState<Error | null>(null);
  const [collectedAmount0, setCollectedAmount0] = useState<bigint | undefined>(undefined);
  const [collectedAmount1, setCollectedAmount1] = useState<bigint | undefined>(undefined);

  // Get the NonfungiblePositionManager address for this chain
  const managerAddress = params?.chainId
    ? NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[params.chainId]
    : undefined;

  // Prepare collect parameters
  const collectParams = params ? prepareCollectParams(params) : null;

  // Write contract for collecting fees
  const {
    writeContract,
    data: collectTxHash,
    isPending: isCollecting,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  // Wait for collect transaction confirmation
  const {
    isLoading: isWaitingForConfirmation,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash: collectTxHash,
    chainId: params?.chainId,
  });

  // Handle collect errors
  useEffect(() => {
    if (writeError) {
      setCollectError(writeError);
    }
  }, [writeError]);

  // Extract collected amounts from transaction receipt
  useEffect(() => {
    if (isSuccess && receipt) {
      // Find the Collect event from the NonfungiblePositionManager contract
      // Event signature: Collect(uint256 indexed tokenId, address recipient, uint256 amount0, uint256 amount1)
      const collectLog = receipt.logs.find(
        log =>
          log.address.toLowerCase() === managerAddress?.toLowerCase() &&
          log.topics[0] === '0x40d0efd1a53d60ecbf40971b9daf7dc90178c3aadc7aab1765632738fa8b8f01' // Collect event signature
      );

      if (collectLog && collectLog.data) {
        try {
          // Decode the data field (amount0 and amount1)
          // Data contains: [amount0 (32 bytes), amount1 (32 bytes)]
          const amount0Hex = '0x' + collectLog.data.slice(2, 66);
          const amount1Hex = '0x' + collectLog.data.slice(66, 130);

          setCollectedAmount0(BigInt(amount0Hex));
          setCollectedAmount1(BigInt(amount1Hex));
        } catch (error) {
          console.error('Failed to extract collected amounts from receipt:', error);
        }
      }
    }
  }, [isSuccess, receipt, managerAddress]);

  // Collect function
  const collect = () => {
    if (!params || !collectParams || !managerAddress) {
      setCollectError(new Error('Missing required parameters for collecting fees'));
      return;
    }

    setCollectError(null);
    setCollectedAmount0(undefined);
    setCollectedAmount1(undefined);

    try {
      writeContract({
        address: managerAddress,
        abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
        functionName: 'collect',
        args: [collectParams],
        chainId: params.chainId,
      });
    } catch (error) {
      setCollectError(error as Error);
    }
  };

  // Reset function
  const reset = () => {
    resetWrite();
    setCollectError(null);
    setCollectedAmount0(undefined);
    setCollectedAmount1(undefined);
  };

  return {
    // Collect transaction
    collect,
    isCollecting,
    isWaitingForConfirmation,
    collectError,
    collectTxHash,

    // Result
    collectedAmount0,
    collectedAmount1,
    isSuccess,

    // Reset
    reset,
  };
}

/**
 * Prepare collect fees parameters
 */
function prepareCollectParams(params: CollectFeesParams) {
  return {
    tokenId: params.tokenId,
    recipient: params.recipient,
    amount0Max: params.amount0Max,
    amount1Max: params.amount1Max,
  };
}
