"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, AlertCircle, Check, RefreshCw } from "lucide-react";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import { formatUnits } from "viem";
import { getChainId, SupportedChainsType } from "@/config/chains";
import { normalizeAddress } from "@/lib/utils/evm";
import { getTokenAmountsFromLiquidity } from "@/lib/utils/uniswap-v3/liquidity";
import { useDecreaseLiquidity } from "@/app-shared/hooks/useDecreaseLiquidity";
import { usePool } from "@/app-shared/hooks/api/usePool";
import { formatCompactValue } from "@/lib/utils/fraction-format";
import { NetworkSwitchStep } from "./NetworkSwitchStep";
import { TransactionStep } from "./TransactionStep";
import type { BasicPosition } from "@/types/positions";
import { parseDecreaseLiquidityEvent, parseCollectEvent } from "@/lib/utils/uniswap-v3/parse-liquidity-events";
import { NONFUNGIBLE_POSITION_MANAGER_ADDRESSES } from "@/lib/contracts/nonfungiblePositionManager";
import { useUpdatePositionWithEvents } from "@/app-shared/hooks/api/useUpdatePositionWithEvents";

interface WithdrawPositionModalProps {
    isOpen: boolean;
    onClose: () => void;
    position: BasicPosition;
}

export function WithdrawPositionModal({
    isOpen,
    onClose,
    position,
}: WithdrawPositionModalProps) {
    const [mounted, setMounted] = useState(false);
    const [withdrawPercent, setWithdrawPercent] = useState<number>(0);
    const [quoteValueInput, setQuoteValueInput] = useState<string>("");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const updateMutation = useUpdatePositionWithEvents();

    const {
        address: walletAddress,
        isConnected,
        chainId: connectedChainId,
    } = useAccount();

    // Ensure component is mounted on client side for portal
    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset mutation state when modal opens
    useEffect(() => {
        if (isOpen) {
            updateMutation.reset();
            decreaseLiquidity.reset();
        }
    }, [isOpen]);

    // Load pool data to get current price
    const {
        pool,
        isLoading: isPoolLoading,
        refetch: refetchPool,
    } = usePool({
        chain: position.pool.chain as SupportedChainsType,
        poolAddress: position.pool.poolAddress,
        enabled: isOpen && !!position.pool.poolAddress,
    });

    // Normalize addresses
    const normalizedWalletAddress = walletAddress
        ? normalizeAddress(walletAddress)
        : null;
    const baseTokenAddress = position.token0IsQuote
        ? position.pool.token1.address
        : position.pool.token0.address;
    const quoteTokenAddress = position.token0IsQuote
        ? position.pool.token0.address
        : position.pool.token1.address;

    // Check if wallet is connected to the wrong network
    const isWrongNetwork = !!(
        isConnected &&
        position.pool.chain &&
        connectedChainId !==
            getChainId(position.pool.chain as SupportedChainsType)
    );

    // Token info for display
    const baseToken = {
        address: baseTokenAddress,
        symbol: position.token0IsQuote
            ? position.pool.token1.symbol
            : position.pool.token0.symbol,
        decimals: position.token0IsQuote
            ? position.pool.token1.decimals
            : position.pool.token0.decimals,
    };

    const quoteToken = {
        address: quoteTokenAddress,
        symbol: position.token0IsQuote
            ? position.pool.token0.symbol
            : position.pool.token1.symbol,
        decimals: position.token0IsQuote
            ? position.pool.token0.decimals
            : position.pool.token1.decimals,
    };

    const quoteTokenDecimals = quoteToken.decimals;

    // Calculate current position value in quote tokens from liquidity
    const currentPositionValue = useMemo(() => {
        if (!pool || !position.liquidity || pool.currentTick === null) {
            return 0n;
        }

        try {
            const currentLiquidity = BigInt(position.liquidity);
            const { token0Amount, token1Amount } = getTokenAmountsFromLiquidity(
                currentLiquidity,
                pool.currentTick,
                position.tickLower,
                position.tickUpper
            );

            const isQuoteToken0 = pool.token0.address.toLowerCase() === quoteTokenAddress.toLowerCase();
            const baseTokenAmount = isQuoteToken0 ? token1Amount : token0Amount;
            const quoteTokenAmount = isQuoteToken0 ? token0Amount : token1Amount;

            // Calculate position value in quote token units
            let positionValueInQuote: bigint = quoteTokenAmount;
            if (baseTokenAmount > 0n && pool.sqrtPriceX96) {
                try {
                    // Convert base amount to quote units using current price
                    const sqrtPriceX96 = BigInt(pool.sqrtPriceX96);

                    if (isQuoteToken0) {
                        // quote=token0, base=token1 -> price (quote/base) = Q192 / S^2
                        const Q192 = 1n << 192n;
                        const baseAsQuote = (baseTokenAmount * Q192) / (sqrtPriceX96 * sqrtPriceX96);
                        positionValueInQuote += baseAsQuote;
                    } else {
                        // quote=token1, base=token0 -> price (quote/base) = S^2 / Q192
                        const Q192 = 1n << 192n;
                        const baseAsQuote = (baseTokenAmount * sqrtPriceX96 * sqrtPriceX96) / Q192;
                        positionValueInQuote += baseAsQuote;
                    }
                } catch (error) {
                    console.error('Error calculating position value in quote:', error);
                    // Fallback to just quote amount if conversion fails
                    positionValueInQuote = quoteTokenAmount;
                }
            }

            return positionValueInQuote;
        } catch (error) {
            console.error('Error calculating current position value:', error);
            return 0n;
        }
    }, [pool, position.liquidity, position.tickLower, position.tickUpper, quoteTokenAddress]);

    // Calculate liquidity to remove based on percentage
    const liquidityToRemove = useMemo(() => {
        const currentLiquidity = BigInt(position.liquidity);
        // Use precise calculation: multiply by percent * 100 to avoid decimals, then divide by 10000
        const percentScaled = Math.floor(withdrawPercent * 100); // Convert to basis points (e.g., 50.5% -> 5050)
        return (currentLiquidity * BigInt(percentScaled)) / 10000n;
    }, [position.liquidity, withdrawPercent]);

    // Calculate token amounts that will be received
    const withdrawAmounts = useMemo(() => {
        if (!pool || liquidityToRemove === 0n || pool.currentTick === null) {
            return { baseAmount: 0n, quoteAmount: 0n };
        }

        try {
            const { token0Amount, token1Amount } = getTokenAmountsFromLiquidity(
                liquidityToRemove,
                pool.currentTick,
                position.tickLower,
                position.tickUpper
            );

            const isQuoteToken0 =
                pool.token0.address.toLowerCase() ===
                quoteTokenAddress.toLowerCase();
            const baseAmount = isQuoteToken0 ? token1Amount : token0Amount;
            const quoteAmount = isQuoteToken0 ? token0Amount : token1Amount;

            return { baseAmount, quoteAmount };
        } catch (error) {
            console.error(
                "Error calculating withdraw amounts from liquidity:",
                error
            );
            return { baseAmount: 0n, quoteAmount: 0n };
        }
    }, [
        pool,
        liquidityToRemove,
        position.tickLower,
        position.tickUpper,
        quoteTokenAddress,
    ]);

    // Calculate minimum amounts with slippage (1% = 100 bps)
    const amount0Min = useMemo(() => {
        if (!pool) return 0n;
        const isQuoteToken0 =
            pool.token0.address.toLowerCase() ===
            quoteTokenAddress.toLowerCase();
        const amount = isQuoteToken0
            ? withdrawAmounts.quoteAmount
            : withdrawAmounts.baseAmount;
        return (amount * 9900n) / 10000n; // 1% slippage
    }, [pool, quoteTokenAddress, withdrawAmounts]);

    const amount1Min = useMemo(() => {
        if (!pool) return 0n;
        const isQuoteToken0 =
            pool.token0.address.toLowerCase() ===
            quoteTokenAddress.toLowerCase();
        const amount = isQuoteToken0
            ? withdrawAmounts.baseAmount
            : withdrawAmounts.quoteAmount;
        return (amount * 9900n) / 10000n; // 1% slippage
    }, [pool, quoteTokenAddress, withdrawAmounts]);

    // Prepare decrease liquidity parameters
    const decreaseParams = useMemo(() => {
        if (
            !position.nftId ||
            !normalizedWalletAddress ||
            !position.pool.chain ||
            liquidityToRemove === 0n
        ) {
            return null;
        }

        return {
            tokenId: BigInt(position.nftId),
            liquidity: liquidityToRemove,
            amount0Min,
            amount1Min,
            chainId: getChainId(position.pool.chain as SupportedChainsType),
            recipient: normalizedWalletAddress as Address,
            slippageBps: 100, // 1% slippage
        };
    }, [
        position.nftId,
        position.pool.chain,
        normalizedWalletAddress,
        liquidityToRemove,
        amount0Min,
        amount1Min,
    ]);

    // Decrease liquidity hook
    const decreaseLiquidity = useDecreaseLiquidity(decreaseParams);

    // Handle percentage slider change
    const handlePercentChange = useCallback(
        (percent: number) => {
            setWithdrawPercent(percent);
            // Update quote value input
            // Convert percent to basis points to maintain precision (e.g., 50.5% -> 5050 basis points)
            const percentScaled = Math.floor(percent * 100);
            const quoteValue =
                (currentPositionValue * BigInt(percentScaled)) / 10000n;

            // Use formatUnits to convert to human-readable string for input field
            setQuoteValueInput(formatUnits(quoteValue, quoteTokenDecimals));
        },
        [currentPositionValue, quoteTokenDecimals]
    );

    // Handle quote value input change
    const handleQuoteValueChange = useCallback(
        (value: string) => {
            setQuoteValueInput(value);

            // Parse input and calculate percentage
            try {
                const parsedValue = parseFloat(value);
                if (isNaN(parsedValue) || parsedValue <= 0) {
                    setWithdrawPercent(0);
                    return;
                }

                // Convert to BigInt in smallest unit
                const valueInSmallestUnit = BigInt(
                    Math.floor(parsedValue * Math.pow(10, quoteTokenDecimals))
                );

                // Calculate percentage
                if (currentPositionValue > 0n) {
                    const percent =
                        Number(
                            (valueInSmallestUnit * 10000n) /
                                currentPositionValue
                        ) / 100;
                    setWithdrawPercent(Math.min(100, Math.max(0, percent)));
                }
            } catch {
                // Invalid input, keep current percentage
            }
        },
        [currentPositionValue, quoteTokenDecimals]
    );

    // Handle withdraw execution
    const handleWithdraw = () => {
        decreaseLiquidity.withdraw();
    };

    // Refresh pool data handler
    const handleRefreshPool = useCallback(async () => {
        if (isRefreshing) return;

        setIsRefreshing(true);
        try {
            await refetchPool();
        } catch (error) {
            console.error("Error refreshing pool data:", error);
        } finally {
            setIsRefreshing(false);
        }
    }, [refetchPool, isRefreshing]);

    // Handle successful withdrawal - seed TWO events (decrease + collect)
    useEffect(() => {
        if (decreaseLiquidity.isSuccess && decreaseLiquidity.receipt && !updateMutation.isPending && !updateMutation.isSuccess) {
            const chainId = getChainId(position.pool.chain as SupportedChainsType);
            const nftManagerAddress = NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId];

            if (!nftManagerAddress) {
                console.error('NFT Manager address not found for chain');
                // Still close modal even if we can't seed events
                setTimeout(() => onClose(), 2000);
                return;
            }

            // Parse both events from multicall receipt
            const decreaseEvent = parseDecreaseLiquidityEvent(
                decreaseLiquidity.receipt,
                nftManagerAddress
            );
            const collectEvent = parseCollectEvent(
                decreaseLiquidity.receipt,
                nftManagerAddress
            );

            const events = [];
            if (decreaseEvent) events.push(decreaseEvent);
            if (collectEvent) events.push(collectEvent);

            if (events.length > 0) {
                // Calculate new total liquidity: current - delta
                const currentLiquidity = BigInt(position.liquidity);
                const liquidityDelta = decreaseEvent ? BigInt(decreaseEvent.liquidity || "0") : 0n;
                const newTotalLiquidity = currentLiquidity - liquidityDelta;

                updateMutation.mutate({
                    chain: position.pool.chain,
                    nftId: position.nftId || "",
                    poolAddress: position.pool.poolAddress,
                    tickLower: position.tickLower,
                    tickUpper: position.tickUpper,
                    liquidity: newTotalLiquidity.toString(),
                    token0IsQuote: position.token0IsQuote,
                    owner: position.owner,
                    events
                });
            }

            // Close modal after update completes
            setTimeout(() => onClose(), 2000);
        }
    }, [decreaseLiquidity.isSuccess, decreaseLiquidity.receipt, position.pool.chain, position.nftId, position.liquidity, position.tickLower, position.tickUpper, position.token0IsQuote, position.owner, position.pool.poolAddress, onClose, updateMutation]);

    // Validation
    const canWithdraw =
        withdrawPercent > 0 &&
        withdrawPercent <= 100 &&
        isConnected &&
        !isWrongNetwork;

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-800/95 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl shadow-black/40 w-full max-w-2xl max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                        <div>
                            <h2 className="text-2xl font-bold text-white">
                                Withdraw Liquidity
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">
                                Remove capital from your {baseToken.symbol}/
                                {quoteToken.symbol} position
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={
                                decreaseLiquidity.isWithdrawing ||
                                decreaseLiquidity.isWaitingForWithdraw
                            }
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
                        {/* Loading State */}
                        {isPoolLoading && (
                            <div className="flex items-center justify-center py-12">
                                <div className="flex items-center gap-3 text-slate-400">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Loading pool data...</span>
                                </div>
                            </div>
                        )}

                        {/* Withdrawal Controls */}
                        {!isPoolLoading && pool && (
                            <>
                                {/* Withdrawal Amount Input with Percentage Slider */}
                                <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-4 space-y-3">
                                    {/* Header with refresh button */}
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-300 font-medium">
                                            Withdrawal Amount ({quoteToken.symbol})
                                        </span>
                                        <button
                                            onClick={handleRefreshPool}
                                            disabled={isRefreshing}
                                            className="p-1 hover:bg-slate-700 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Refresh pool price"
                                        >
                                            <RefreshCw className={`w-4 h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={quoteValueInput}
                                        onChange={(e) =>
                                            handleQuoteValueChange(
                                                e.target.value
                                            )
                                        }
                                        placeholder="0.0"
                                        className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-blue-500 transition-colors"
                                    />

                                    {/* Percentage Slider */}
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={withdrawPercent}
                                        onChange={(e) =>
                                            handlePercentChange(
                                                parseFloat(e.target.value)
                                            )
                                        }
                                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer
                                                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                                                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer
                                                   [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                                                   [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                                    />

                                    {/* Maximum and Percentage display */}
                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                        <span>
                                            Maximum:{" "}
                                            {formatCompactValue(
                                                currentPositionValue,
                                                quoteTokenDecimals
                                            )}{" "}
                                            {quoteToken.symbol}
                                        </span>
                                        <span>
                                            {withdrawPercent.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>

                                {/* Preview Section */}
                                <div className={`bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-4 ${withdrawPercent === 0 ? 'opacity-50' : ''}`}>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-300 font-medium">
                                            You will receive:
                                        </span>
                                        <span className="text-white font-medium">
                                            {withdrawPercent > 0
                                                ? `${formatCompactValue(withdrawAmounts.baseAmount, baseToken.decimals)} ${baseToken.symbol} + ${formatCompactValue(withdrawAmounts.quoteAmount, quoteToken.decimals)} ${quoteToken.symbol}`
                                                : `0 ${baseToken.symbol} + 0 ${quoteToken.symbol}`
                                            }
                                        </span>
                                    </div>
                                </div>

                                {/* Transaction Step */}
                                <div className={`bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-4 ${withdrawPercent === 0 ? 'opacity-50' : ''}`}>
                                        <h3 className="text-lg font-semibold text-white mb-4">
                                            Transaction
                                        </h3>
                                        <div className="space-y-3">
                                            {/* Network Switch Step */}
                                            <NetworkSwitchStep
                                                chain={position.pool.chain as SupportedChainsType}
                                                isWrongNetwork={isWrongNetwork}
                                            />

                                            {/* Withdraw (Multicall: Decrease + Collect) */}
                                            <TransactionStep
                                                title="Withdraw Liquidity"
                                                description="Remove liquidity and collect tokens in one transaction"
                                                isLoading={
                                                    decreaseLiquidity.isWithdrawing ||
                                                    decreaseLiquidity.isWaitingForWithdraw
                                                }
                                                isComplete={
                                                    decreaseLiquidity.withdrawSuccess
                                                }
                                                isDisabled={!canWithdraw}
                                                onExecute={handleWithdraw}
                                                showExecute={
                                                    decreaseLiquidity.currentStep ===
                                                    "idle"
                                                }
                                            />
                                        </div>

                                        {/* Error Display */}
                                        {decreaseLiquidity.withdrawError && (
                                            <div className="mt-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                                    <div>
                                                        <h5 className="text-red-400 font-medium">
                                                            Transaction Error
                                                        </h5>
                                                        <p className="text-red-200/80 text-sm mt-1">
                                                            {decreaseLiquidity.withdrawError.message}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Success Message */}
                                        {decreaseLiquidity.isSuccess && (
                                            <div className="mt-4 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                                                    <div>
                                                        <h5 className="text-green-400 font-medium">
                                                            Withdrawal
                                                            Successful!
                                                        </h5>
                                                        <p className="text-green-200/80 text-sm mt-1">
                                                            Your tokens have
                                                            been transferred.
                                                            Closing modal...
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );

    return createPortal(modalContent, document.body);
}
