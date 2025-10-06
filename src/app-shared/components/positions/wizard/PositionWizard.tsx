"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X, ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslations } from "@/app-shared/i18n/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { isValidChainSlug } from "@/config/chains";
import { useCreatePositionOptimistic } from "@/app-shared/hooks/api/useCreatePositionOptimistic";
import { usePositionRefresh } from "@/app-shared/hooks/api/usePositionRefresh";
import { useSession } from "next-auth/react";
import { compareAddresses } from "@/lib/utils/evm";

import { IntroStep } from "./IntroStep";
import { ChainSelectionStep } from "./ChainSelectionStep";
import { TokenPairStep } from "./TokenPairStep";
import { PoolSelectionStep } from "./PoolSelectionStep";
import { PositionConfigStep } from "./PositionConfigStep";
import { OpenPositionStep } from "./OpenPositionStep";

interface PositionWizardProps {
    isOpen: boolean;
    onClose?: () => void;
    // eslint-disable-next-line no-unused-vars
    onPositionCreated?: (position: any) => void;
}

export function PositionWizard({
    isOpen,
    onClose,
    onPositionCreated,
}: PositionWizardProps) {
    const TOTAL_STEPS = 6;
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [currentStep, setCurrentStep] = useState<number>(0);
    const [isChainSelected, setChainSelected] = useState<boolean>(false);
    const [isTokenPairSelected, setTokenPairSelected] =
        useState<boolean>(false);
    const [isPoolSelected, setPoolSelected] = useState<boolean>(false);
    const [isPositionConfigured, setPositionConfigured] =
        useState<boolean>(false);
    const [isPositionCreated, setPositionCreated] = useState<boolean>(false);

    // Query client for cache updates
    const queryClient = useQueryClient();

    // Get wallet address and user session
    const { address: walletAddress } = useAccount();
    const { data: session } = useSession();
    const user = session?.user;

    // Optimistic position creation mutation
    const createOptimisticMutation = useCreatePositionOptimistic({
        onSuccess: (response) => {
            // Optimistically update positions list
            queryClient.setQueriesData(
                { queryKey: ['positions', 'list'] },
                (oldData: any) => {
                    if (!oldData?.data || !response.data) return oldData;

                    return {
                        ...oldData,
                        data: {
                            positions: [response.data, ...oldData.data.positions],
                            pagination: {
                                ...oldData.data.pagination,
                                total: oldData.data.pagination.total + 1
                            }
                        }
                    };
                }
            );

            // Notify parent immediately
            if (response.data) {
                onPositionCreated?.(response.data);
            }

            // Trigger background refresh to sync events/PnL/APR/curve
            if (response.data && user?.id) {
                refreshMutation.mutate({
                    userId: user.id,
                    chain: response.data.chain,
                    protocol: response.data.protocol,
                    nftId: response.data.nftId
                });
            }
        }
    });

    // Background refresh mutation
    const refreshMutation = usePositionRefresh();

    // Handle closing wizard - let parent handle URL clearing if available
    const handleClose = useCallback(() => {
        onClose?.();
    }, [onClose]);

    useEffect(() => {
        const step = searchParams.get("step");
        if (step) setCurrentStep(parseInt(step));
    }, [searchParams]);

    // Initialize wizard state from URL parameters when loading at a specific step
    useEffect(() => {
        const chainParam = searchParams.get("chain");
        const baseTokenParam = searchParams.get("baseToken");
        const quoteTokenParam = searchParams.get("quoteToken");
        const poolAddressParam = searchParams.get("poolAddress");

        // Validate and set chain selection state
        const isValidChain = chainParam && isValidChainSlug(chainParam);
        setChainSelected(!!isValidChain);

        // Validate and set token pair selection state
        const hasValidTokenPair = !!baseTokenParam && !!quoteTokenParam;
        setTokenPairSelected(hasValidTokenPair);

        // Validate and set pool selection state
        const hasValidPool = !!poolAddressParam;
        setPoolSelected(hasValidPool);

        // Note: Position configured state is handled by the PositionConfigStep callback
        // so we don't set it here to avoid conflicts
    }, [searchParams]);

    const canGoNext = useCallback(() => {
        // Step 0: Always can go next from intro step
        if (currentStep === 0) return true;

        // Step 1: Need chain selected
        if (currentStep === 1) return isChainSelected;

        // Step 2: Need chain and token pair selected
        if (currentStep === 2) return isChainSelected && isTokenPairSelected;

        // Step 3: Need chain, token pair, and pool selected
        if (currentStep === 3)
            return isChainSelected && isTokenPairSelected && isPoolSelected;

        // Step 4: Need everything including position configured
        if (currentStep === 4)
            return (
                isChainSelected &&
                isTokenPairSelected &&
                isPoolSelected &&
                isPositionConfigured
            );

        // Step 5+: Handle later steps
        if (currentStep >= 5) {
            return isPositionCreated; // Can only proceed if position is created
        }

        return false;
    }, [
        currentStep,
        isChainSelected,
        isPositionConfigured,
        isPoolSelected,
        isPositionCreated,
        isTokenPairSelected,
    ]);

    const getStepTitle = (step: number): string => {
        switch (step) {
            case 0:
                return t("positionWizard.steps.openPosition.title");
            case 1:
                return t("positionWizard.steps.chainSelection.title");
            case 2:
                return t("positionWizard.steps.tokenPair.title");
            case 3:
                return t("positionWizard.steps.poolSelection.title");
            case 4:
                return "Configure your position parameters and analyze the risk profile.";
            case 5:
                return "Open Position on Uniswap";
            default:
                return "";
        }
    };

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 0:
                return <IntroStep />;
            case 1:
                return <ChainSelectionStep onChainSelect={setChainSelected} />;
            case 2:
                return (
                    <TokenPairStep onTokenPairSelect={setTokenPairSelected} />
                );
            case 3:
                return <PoolSelectionStep onPoolSelect={setPoolSelected} />;
            case 4:
                return (
                    <PositionConfigStep
                        onConfigSelect={setPositionConfigured}
                    />
                );
            case 5:
                return (
                    <OpenPositionStep
                        onPositionCreated={(positionData) => {
                            // Create position optimistically when transaction succeeds
                            if (positionData) {
                                setPositionCreated(true);

                                // Map chain name for local fork
                                const chainForApi = positionData.chain === 'arbitrum-fork-local'
                                    ? 'arbitrum'
                                    : positionData.chain;

                                // Determine token0IsQuote based on address ordering
                                // token0 < token1 by address, so if baseToken > quoteToken, then token0 is quote
                                const token0IsQuote = compareAddresses(
                                    positionData.baseToken,
                                    positionData.quoteToken
                                ) > 0;

                                // Create position optimistically (fast - returns immediately)
                                createOptimisticMutation.mutate({
                                    chain: chainForApi,
                                    nftId: positionData.nftId.toString(),
                                    poolAddress: positionData.pool.poolAddress,
                                    tickLower: positionData.tickLower,
                                    tickUpper: positionData.tickUpper,
                                    liquidity: positionData.liquidity,
                                    token0IsQuote,
                                    owner: walletAddress
                                });
                            } else {
                                setPositionCreated(false);
                            }
                        }}
                    />
                );
            default:
                return null;
        }
    };

    function goNext() {
        if (currentStep == TOTAL_STEPS - 1) return;
        //setCurrentStep(currentStep + 1);
        const params = new URLSearchParams(searchParams.toString());
        params.set("step", Number(currentStep + 1).toString());
        router.push(pathname + "?" + params.toString());
    }

    function goBack() {
        if (currentStep == 0) return;
        const params = new URLSearchParams(searchParams.toString());
        const newStep = currentStep - 1;
        params.set("step", Number(newStep).toString());

        // Clean up URL parameters from subsequent steps
        if (newStep <= 1) {
            // Going back to chain selection or earlier - remove all subsequent params
            params.delete("chain");
            params.delete("baseToken");
            params.delete("quoteToken");
            params.delete("poolAddress");
            params.delete("tickLower");
            params.delete("tickUpper");
            params.delete("liquidity");
        } else if (newStep <= 2) {
            // Going back to token pair selection - remove token and pool params
            params.delete("baseToken");
            params.delete("quoteToken");
            params.delete("poolAddress");
            params.delete("tickLower");
            params.delete("tickUpper");
            params.delete("liquidity");
        } else if (newStep <= 3) {
            // Going back to pool selection - remove pool params
            params.delete("poolAddress");
            params.delete("tickLower");
            params.delete("tickUpper");
            params.delete("liquidity");
        } else if (newStep <= 4) {
            // Going back to position config - preserve position params since they're still valid
            // Don't delete tickLower, tickUpper, or liquidity as user may want to see/modify them
        }

        router.push(pathname + "?" + params.toString());
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop - No click to close */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-800/95 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-white">
                            {t("positionWizard.title")}
                        </h2>

                        {/* Progress Indicator */}
                        <div className="flex items-center gap-2">
                            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full transition-colors ${
                                        i <= currentStep
                                            ? "bg-blue-500"
                                            : "bg-slate-600"
                                    }`}
                                />
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleClose}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Step Title */}
                <div className="px-6 py-4 border-b border-slate-700/30">
                    <h3 className="text-lg font-semibold text-white">
                        {getStepTitle(currentStep)}
                    </h3>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {renderCurrentStep()}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-slate-700/50">
                    <div className="text-sm text-slate-400">
                        {t("positionWizard.stepIndicator", {
                            current: currentStep + 1,
                            total: TOTAL_STEPS,
                        })}
                    </div>

                    <div className="flex items-center gap-3">
                        {currentStep > 0 && (
                            <button
                                onClick={goBack}
                                className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                {t("common.back")}
                            </button>
                        )}

                        {currentStep < TOTAL_STEPS - 1 && (
                            <button
                                onClick={goNext}
                                disabled={!canGoNext()}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg transition-colors"
                            >
                                {t("common.next")}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )}

                        {currentStep === TOTAL_STEPS - 1 && (
                            <button
                                onClick={() => {
                                    // Position already imported automatically, just close modal
                                    handleClose();
                                }}
                                disabled={!isPositionCreated}
                                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg transition-colors"
                            >
                                {isPositionCreated ? "Finish" : t("positionWizard.createPosition")}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
