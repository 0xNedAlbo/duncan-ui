import { useState, useEffect } from 'react';
import { Address, erc20Abi, maxUint256 } from 'viem';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { NONFUNGIBLE_POSITION_MANAGER_ADDRESSES } from '@/lib/contracts/nonfungiblePositionManager';

export interface UseTokenApprovalParams {
  tokenAddress: Address | null;
  ownerAddress: Address | null;
  requiredAmount: bigint;
  chainId: number | undefined;
  enabled?: boolean;
}

export interface UseTokenApprovalResult {
  // Current allowance state
  allowance: bigint | undefined;
  isLoadingAllowance: boolean;
  isApproved: boolean;
  needsApproval: boolean;

  // Approval transaction
  approve: () => void;
  isApproving: boolean;
  isWaitingForConfirmation: boolean;
  approvalError: Error | null;
  approvalTxHash: Address | undefined;

  // Refetch allowance
  refetchAllowance: () => void;
}

/**
 * Hook to manage ERC20 token approvals for Uniswap V3 NonfungiblePositionManager
 *
 * @param tokenAddress - The ERC20 token address to approve
 * @param ownerAddress - The wallet address that owns the tokens
 * @param requiredAmount - The amount of tokens needed (in smallest unit, e.g., wei)
 * @param chainId - The chain ID for the operation
 * @param enabled - Whether to enable the hook (default: true)
 */
export function useTokenApproval({
  tokenAddress,
  ownerAddress,
  requiredAmount,
  chainId,
  enabled = true,
}: UseTokenApprovalParams): UseTokenApprovalResult {
  const [approvalError, setApprovalError] = useState<Error | null>(null);

  // Get the NonfungiblePositionManager address for this chain
  const spenderAddress = chainId ? NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId] : undefined;

  // Read current allowance
  const {
    data: allowanceData,
    isLoading: isLoadingAllowance,
    refetch: refetchAllowance,
  } = useReadContract({
    address: tokenAddress ?? undefined,
    abi: erc20Abi,
    functionName: 'allowance',
    args: ownerAddress && spenderAddress ? [ownerAddress, spenderAddress] : undefined,
    query: {
      enabled: enabled && !!tokenAddress && !!ownerAddress && !!spenderAddress && !!chainId,
    },
    chainId,
  });

  const allowance = allowanceData !== undefined ? BigInt(allowanceData.toString()) : undefined;

  // Check if approval is needed
  const isApproved = allowance !== undefined && allowance >= requiredAmount;
  const needsApproval = allowance !== undefined && allowance < requiredAmount;

  // Write contract for approval
  const {
    writeContract,
    data: approvalTxHash,
    isPending: isApproving,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  // Wait for approval transaction confirmation
  const {
    isLoading: isWaitingForConfirmation,
    isSuccess: isApprovalConfirmed,
  } = useWaitForTransactionReceipt({
    hash: approvalTxHash,
    chainId,
  });

  // Handle approval errors
  useEffect(() => {
    if (writeError) {
      setApprovalError(writeError);
    }
  }, [writeError]);

  // Refetch allowance after approval is confirmed
  useEffect(() => {
    if (isApprovalConfirmed) {
      refetchAllowance();
      resetWrite();
      setApprovalError(null);
    }
  }, [isApprovalConfirmed, refetchAllowance, resetWrite]);

  // Approve function - approves max amount for gas efficiency
  const approve = () => {
    if (!tokenAddress || !spenderAddress || !chainId) {
      setApprovalError(new Error('Missing required parameters for approval'));
      return;
    }

    setApprovalError(null);

    try {
      writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spenderAddress, maxUint256], // Approve max amount to avoid future approvals
        chainId,
      });
    } catch (error) {
      setApprovalError(error as Error);
    }
  };

  return {
    // Allowance state
    allowance,
    isLoadingAllowance,
    isApproved,
    needsApproval,

    // Approval transaction
    approve,
    isApproving,
    isWaitingForConfirmation,
    approvalError,
    approvalTxHash,

    // Refetch
    refetchAllowance,
  };
}