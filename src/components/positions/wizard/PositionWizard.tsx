"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import type { WizardState, TokenPair, PoolOption, PositionConfig } from "./types";
import type { SupportedChainsType } from "@/config/chains";
import { normalizeAddress, isValidAddress } from "@/lib/utils/evm";
import { TOTAL_STEPS } from "./types";
import { searchTokens } from "@/hooks/api/useTokenSearch";
import { OpenPositionStep } from "./OpenPositionStep";
import { ChainSelectionStep } from "./ChainSelectionStep";
import { TokenPairStep } from "./TokenPairStep";
import { PoolSelectionStep } from "./PoolSelectionStep";
import { PositionConfigStep } from "./PositionConfigStep";

interface PositionWizardProps {
    isOpen: boolean;
    onClose: () => void;
    // eslint-disable-next-line no-unused-vars
    onPositionCreated?: (position: any) => void;
}

export function PositionWizard({
    isOpen,
    onClose,
    onPositionCreated,
}: PositionWizardProps) {
    const t = useTranslations();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [wizardState, setWizardState] = useState<WizardState>({
        currentStep: 0,
        selectedChain: null,
        selectedTokenPair: null,
        selectedPool: null,
        positionConfig: null,
    });

    // Helper function to fetch token metadata from address
    const fetchTokenMetadata = async (chain: SupportedChainsType, address: string) => {
        try {
            const results = await searchTokens(chain, address);
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            console.warn(`Failed to fetch token metadata for ${address}:`, error);
            return null;
        }
    };

    // Read state from URL parameters
    useEffect(() => {
        if (!isOpen) return;

        const loadStateFromUrl = async () => {
            const chain = searchParams.get('chain') as SupportedChainsType | null;
            const step = parseInt(searchParams.get('step') || '0');

            // Parse token pair if present
            let tokenPair: TokenPair | null = null;
            const baseToken = searchParams.get('baseToken');
            const quoteToken = searchParams.get('quoteToken');

            if (baseToken && quoteToken && chain && isValidAddress(baseToken) && isValidAddress(quoteToken)) {
                // Normalize the addresses from URL params
                const normalizedBaseAddress = normalizeAddress(baseToken);
                const normalizedQuoteAddress = normalizeAddress(quoteToken);

                // Fetch token metadata for both tokens
                const [baseTokenData, quoteTokenData] = await Promise.all([
                    fetchTokenMetadata(chain, normalizedBaseAddress),
                    fetchTokenMetadata(chain, normalizedQuoteAddress)
                ]);

                // Create token pair with full metadata including logos
                tokenPair = {
                    baseToken: {
                        address: normalizedBaseAddress,
                        symbol: baseTokenData?.symbol || normalizedBaseAddress.substring(0, 6) + '...',
                        name: baseTokenData?.name || 'Unknown Token',
                        decimals: baseTokenData?.decimals || 18,
                        logoUrl: baseTokenData?.logoUrl
                    } as any,
                    quoteToken: {
                        address: normalizedQuoteAddress,
                        symbol: quoteTokenData?.symbol || normalizedQuoteAddress.substring(0, 6) + '...',
                        name: quoteTokenData?.name || 'Unknown Token',
                        decimals: quoteTokenData?.decimals || 18,
                        logoUrl: quoteTokenData?.logoUrl
                    } as any,
                    isValidPair: true,
                };
            }

            // Parse pool if present
            let pool: PoolOption | null = null;
            const fee = searchParams.get('fee');
            if (fee && tokenPair) {
                // TODO: Create proper PoolOption object when pools are implemented
                pool = {
                    pool: {} as any,
                    fee: parseInt(fee),
                    feePercentage: `${parseInt(fee) / 10000}%`,
                    tickSpacing: parseInt(fee) === 500 ? 10 : parseInt(fee) === 3000 ? 60 : 200,
                    liquidity: BigInt(0),
                };
            }

            // Parse position config if present
            let positionConfig: PositionConfig | null = null;
            const lowerPrice = searchParams.get('lowerPrice');
            const upperPrice = searchParams.get('upperPrice');
            const liquidityAmount = searchParams.get('liquidityAmount');
            if (lowerPrice && upperPrice && liquidityAmount) {
                positionConfig = {
                    lowerPrice: BigInt(Math.floor(parseFloat(lowerPrice) * 1e6)),
                    upperPrice: BigInt(Math.floor(parseFloat(upperPrice) * 1e6)),
                    liquidityAmount: BigInt(Math.floor(parseFloat(liquidityAmount) * 1e18)),
                    baseTokenAmount: BigInt(0),
                    quoteTokenAmount: BigInt(0),
                    expectedFees: BigInt(0),
                };
            }

            // Determine the maximum allowed step based on available data
            let maxAllowedStep = 0;
            if (chain) maxAllowedStep = Math.max(maxAllowedStep, 1);
            if (tokenPair) maxAllowedStep = Math.max(maxAllowedStep, 2);
            if (pool) maxAllowedStep = Math.max(maxAllowedStep, 3);
            if (positionConfig) maxAllowedStep = Math.max(maxAllowedStep, 4);

            // Only override the step from URL if it's significantly ahead of available data
            // Allow users to be one step ahead to make selections
            const finalStep = step <= maxAllowedStep + 1 ? step : maxAllowedStep;

            setWizardState({
                currentStep: finalStep,
                selectedChain: chain,
                selectedTokenPair: tokenPair,
                selectedPool: pool,
                positionConfig: positionConfig,
            });
        };

        // Execute the async URL loading
        loadStateFromUrl();
    }, [isOpen, searchParams]);

    // Update URL when state changes
    const updateWizardState = useCallback(
        (updates: Partial<WizardState>) => {
            const newState = { ...wizardState, ...updates };
            setWizardState(newState);

            // Build new URL parameters
            const params = new URLSearchParams(searchParams);
            params.set('wizard', 'true');
            params.set('step', newState.currentStep.toString());

            if (newState.selectedChain) {
                params.set('chain', newState.selectedChain);
            } else {
                params.delete('chain');
            }

            if (newState.selectedTokenPair) {
                params.set('baseToken', normalizeAddress(newState.selectedTokenPair.baseToken.address));
                params.set('quoteToken', normalizeAddress(newState.selectedTokenPair.quoteToken.address));
            } else {
                params.delete('baseToken');
                params.delete('quoteToken');
            }

            if (newState.selectedPool) {
                params.set('fee', newState.selectedPool.fee.toString());
            } else {
                params.delete('fee');
            }

            if (newState.positionConfig) {
                params.set('lowerPrice', (Number(newState.positionConfig.lowerPrice) / 1e6).toString());
                params.set('upperPrice', (Number(newState.positionConfig.upperPrice) / 1e6).toString());
                params.set('liquidityAmount', (Number(newState.positionConfig.liquidityAmount) / 1e18).toString());
            } else {
                params.delete('lowerPrice');
                params.delete('upperPrice');
                params.delete('liquidityAmount');
            }

            router.push(`?${params.toString()}`);
        },
        [wizardState, searchParams, router]
    );

    const goToStep = useCallback((step: number) => {
        updateWizardState({
            currentStep: Math.max(0, Math.min(step, TOTAL_STEPS - 1)),
        });
    }, [updateWizardState]);

    const goNext = useCallback(() => {
        goToStep(wizardState.currentStep + 1);
    }, [goToStep, wizardState.currentStep]);

    const goBack = useCallback(() => {
        goToStep(wizardState.currentStep - 1);
    }, [goToStep, wizardState.currentStep]);

    // Handle closing wizard and cleaning up URL
    const handleClose = useCallback(() => {
        const params = new URLSearchParams(searchParams);
        // Remove all wizard-related parameters
        params.delete('wizard');
        params.delete('step');
        params.delete('chain');
        params.delete('baseToken');
        params.delete('quoteToken');
        params.delete('fee');
        params.delete('lowerPrice');
        params.delete('upperPrice');
        params.delete('liquidityAmount');

        const newUrl = params.toString() ? `?${params.toString()}` : '/dashboard';
        router.push(newUrl);
        onClose();
    }, [searchParams, router, onClose]);

    const canGoNext = useCallback(() => {
        switch (wizardState.currentStep) {
            case 0: // Open Position
                return true;
            case 1: // Chain Selection
                return wizardState.selectedChain !== null;
            case 2: // Token Pair
                return wizardState.selectedTokenPair !== null;
            case 3: // Pool Selection
                return wizardState.selectedPool !== null;
            case 4: // Position Config
                return wizardState.positionConfig !== null;
            default:
                return false;
        }
    }, [wizardState]);

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
                return t("positionWizard.steps.positionConfig.title");
            default:
                return "";
        }
    };

    const renderCurrentStep = () => {
        switch (wizardState.currentStep) {
            case 0:
                return (
                    <OpenPositionStep
                        onNext={goNext}
                    />
                );
            case 1:
                return (
                    <ChainSelectionStep
                        selectedChain={wizardState.selectedChain}
                        onChainSelect={(chain) =>
                            updateWizardState({ selectedChain: chain })
                        }
                        onNext={goNext}
                        onBack={goBack}
                    />
                );
            case 2:
                return (
                    <TokenPairStep
                        chain={wizardState.selectedChain!}
                        selectedPair={wizardState.selectedTokenPair}
                        onPairSelect={(pair) =>
                            updateWizardState({ selectedTokenPair: pair })
                        }
                        onNext={goNext}
                        onBack={goBack}
                    />
                );
            case 3:
                return (
                    <PoolSelectionStep
                        tokenPair={wizardState.selectedTokenPair!}
                        selectedPool={wizardState.selectedPool}
                        onPoolSelect={(pool) =>
                            updateWizardState({ selectedPool: pool })
                        }
                        onNext={goNext}
                        onBack={goBack}
                    />
                );
            case 4:
                return (
                    <PositionConfigStep
                        pool={wizardState.selectedPool!.pool}
                        config={wizardState.positionConfig}
                        onConfigChange={(config) =>
                            updateWizardState({ positionConfig: config })
                        }
                        onCreatePosition={() => {
                            // TODO: Implement position creation
                            onPositionCreated?.(wizardState);
                            onClose();
                        }}
                        onBack={goBack}
                    />
                );
            default:
                return null;
        }
    };

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
                                        i <= wizardState.currentStep
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
                        {getStepTitle(wizardState.currentStep)}
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
                            current: wizardState.currentStep + 1,
                            total: TOTAL_STEPS,
                        })}
                    </div>

                    <div className="flex items-center gap-3">
                        {wizardState.currentStep > 0 && (
                            <button
                                onClick={goBack}
                                className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                {t("common.back")}
                            </button>
                        )}

                        {wizardState.currentStep < TOTAL_STEPS - 1 && (
                            <button
                                onClick={goNext}
                                disabled={!canGoNext()}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg transition-colors"
                            >
                                {t("common.next")}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )}

                        {wizardState.currentStep === TOTAL_STEPS - 1 && (
                            <button
                                onClick={() => {
                                    onPositionCreated?.(wizardState);
                                    handleClose();
                                }}
                                disabled={!canGoNext()}
                                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg transition-colors"
                            >
                                {t("positionWizard.createPosition")}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}