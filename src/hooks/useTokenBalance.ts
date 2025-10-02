import { useReadContract, useWatchContractEvent } from "wagmi";
import { erc20Abi, type Address } from "viem";
import { normalizeAddress } from "@/lib/utils/evm";

export interface UseTokenBalanceParams {
    tokenAddress: string | null | undefined;
    walletAddress: string | null | undefined;
    chainId?: number;
    enabled?: boolean;
}

export interface UseTokenBalanceResult {
    balance: bigint;
    isLoading: boolean;
    refetch: () => void;
}

/**
 * Reusable hook for fetching ERC20 token balance with automatic updates
 *
 * Features:
 * - Fetches token balance for a wallet address
 * - Automatically refetches on Transfer events (incoming/outgoing)
 * - Supports chain-specific queries
 * - Can be disabled via enabled flag
 *
 * @param params - Token balance parameters
 * @returns Balance data and loading state
 */
export function useTokenBalance({
    tokenAddress,
    walletAddress,
    chainId,
    enabled = true
}: UseTokenBalanceParams): UseTokenBalanceResult {
    // Normalize addresses for consistency
    const normalizedTokenAddress = tokenAddress ? normalizeAddress(tokenAddress) : null;
    const normalizedWalletAddress = walletAddress ? normalizeAddress(walletAddress) : null;

    // Determine if the query should be enabled
    const isEnabled = enabled && !!normalizedTokenAddress && !!normalizedWalletAddress;

    // Fetch token balance
    const {
        data: balanceData,
        isLoading,
        refetch,
    } = useReadContract({
        address: normalizedTokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [normalizedWalletAddress as `0x${string}`],
        query: {
            enabled: isEnabled,
        },
        ...(chainId && { chainId }),
    });

    // Watch for outgoing transfers (from this wallet)
    useWatchContractEvent({
        address: normalizedTokenAddress as `0x${string}`,
        abi: erc20Abi,
        eventName: "Transfer",
        args: {
            from: normalizedWalletAddress as `0x${string}`,
        },
        onLogs: () => {
            refetch();
        },
        enabled: isEnabled,
        ...(chainId && { chainId }),
    });

    // Watch for incoming transfers (to this wallet)
    useWatchContractEvent({
        address: normalizedTokenAddress as `0x${string}`,
        abi: erc20Abi,
        eventName: "Transfer",
        args: {
            to: normalizedWalletAddress as `0x${string}`,
        },
        onLogs: () => {
            refetch();
        },
        enabled: isEnabled,
        ...(chainId && { chainId }),
    });

    // Convert balance data to bigint, defaulting to 0n if not available
    const balance = balanceData ? BigInt(balanceData.toString()) : 0n;

    return {
        balance,
        isLoading,
        refetch,
    };
}
