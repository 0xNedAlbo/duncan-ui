"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Check, AlertCircle, Loader2, Copy, ExternalLink } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import type { SupportedChainsType } from "@/config/chains";
import type { TokenPair } from "./types";
import { useTokenSearch, type TokenSearchResult } from "@/hooks/api/useTokenSearch";
import { useTokenPairValidation } from "@/hooks/useTokenPairValidation";
import { getPopularTokens } from "@/lib/config/popularTokens";
import { truncateAddress, truncateText, getExplorerAddressUrl } from "@/lib/utils/evm";

interface TokenSelection {
    token: TokenSearchResult | null;
    isSearching: boolean;
    showDropdown: boolean;
}

interface TokenInputProps {
    type: 'base' | 'quote';
    selection: TokenSelection;
    query: string;
    chain: SupportedChainsType;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onQueryChange: (query: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onTokenSelect: (token: TokenSearchResult) => void;
    searchHook: ReturnType<typeof useTokenSearch>;
    popularTokens: any[];
    placeholder: string;
    label: string;
    color: string;
    onClearToken: () => void;
}

function TokenInput({
    type: _type,
    selection,
    query,
    chain,
    onQueryChange,
    onTokenSelect,
    searchHook,
    popularTokens,
    placeholder,
    label,
    color,
    onClearToken,
}: TokenInputProps) {
    const t = useTranslations();

    return (
        <div className="relative">
            <label className={`block text-sm font-medium ${color} mb-2`}>
                {label}
            </label>

            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-700 border rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 border-slate-600 focus:ring-${color.split('-')[1]}-500`}
                />
                {searchHook.isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                )}
            </div>

            {/* Selected Token Display */}
            {selection.token && (
                <div className="mt-2 flex items-center gap-2 p-2 bg-slate-800 rounded border">
                    {selection.token.logoUrl && (
                        <img
                            src={selection.token.logoUrl}
                            alt={selection.token.symbol}
                            className="w-6 h-6 rounded-full"
                        />
                    )}
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{selection.token.symbol}</span>
                            {selection.token.verified && (
                                <Check className="w-4 h-4 text-green-400" />
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400">{truncateText(selection.token.name, 16)}</span>
                            {selection.token.address && (
                                <>
                                    <span className="text-slate-500 font-mono">{truncateAddress(selection.token.address)}</span>
                                    <div className="flex items-center gap-1">
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (selection.token?.address) {
                                                    navigator.clipboard.writeText(selection.token.address);
                                                }
                                            }}
                                            className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                                            title="Copy address"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </div>
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (selection.token?.address) {
                                                    window.open(getExplorerAddressUrl(selection.token.address, chain), '_blank');
                                                }
                                            }}
                                            className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                                            title="View on explorer"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClearToken}
                        className="text-slate-400 hover:text-white"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Popular Tokens (when no search) */}
            {!selection.token && !query && popularTokens.length > 0 && (
                <div className="mt-3">
                    <p className="text-xs text-slate-400 uppercase font-medium mb-2">
                        {t("positionWizard.tokenPair.popular")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {popularTokens.map((token) => (
                            <button
                                key={token.address}
                                onClick={() => onTokenSelect({
                                    address: token.address,
                                    symbol: token.symbol,
                                    name: token.name,
                                    decimals: 18, // Default - will be resolved
                                    verified: true,
                                    source: 'popular',
                                })}
                                className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-full transition-colors"
                            >
                                {token.symbol}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Search Results Dropdown */}
            {selection.showDropdown && searchHook.results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {searchHook.results.map((token) => (
                        <button
                            key={token.address}
                            onClick={() => onTokenSelect(token)}
                            className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0"
                        >
                            <div className="flex items-center gap-3">
                                {token.logoUrl && (
                                    <img
                                        src={token.logoUrl}
                                        alt={token.symbol}
                                        className="w-6 h-6 rounded-full flex-shrink-0"
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-white">{token.symbol}</span>
                                        {token.verified && <Check className="w-3 h-3 text-green-400" />}
                                        <span className="text-xs text-slate-400">{token.source}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-slate-300">{truncateText(token.name, 16)}</span>
                                        {token.address && (
                                            <>
                                                <span className="text-slate-500 font-mono text-xs">{truncateAddress(token.address)}</span>
                                                <div className="flex items-center gap-1">
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(token.address!);
                                                        }}
                                                        className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                                                        title="Copy address"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </div>
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(getExplorerAddressUrl(token.address!, chain), '_blank');
                                                        }}
                                                        className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                                                        title="View on explorer"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Search Error */}
            {searchHook.error && (
                <div className="mt-2 text-sm text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {searchHook.error}
                </div>
            )}
        </div>
    );
}

interface TokenPairStepProps {
    chain: SupportedChainsType;
    selectedPair: TokenPair | null;
    onPairSelect: (pair: TokenPair) => void;
    onNext: () => void;
    onBack: () => void;
}

export function TokenPairStep({
    chain,
    selectedPair,
    onPairSelect,
    // onNext,
    // onBack,
}: TokenPairStepProps) {
    const t = useTranslations();

    // Track if we've already notified parent about current token pair
    const lastNotifiedPairRef = useRef<string | null>(null);

    // Token selection state
    const [baseSelection, setBaseSelection] = useState<TokenSelection>({
        token: selectedPair?.baseToken ? {
            address: selectedPair.baseToken.address,
            symbol: selectedPair.baseToken.symbol,
            name: selectedPair.baseToken.name || selectedPair.baseToken.symbol,
            decimals: selectedPair.baseToken.decimals,
            verified: true,
            source: 'database' as const,
            logoUrl: (selectedPair.baseToken as any).logoUrl,
        } : null,
        isSearching: false,
        showDropdown: false,
    });

    const [quoteSelection, setQuoteSelection] = useState<TokenSelection>({
        token: selectedPair?.quoteToken ? {
            address: selectedPair.quoteToken.address,
            symbol: selectedPair.quoteToken.symbol,
            name: selectedPair.quoteToken.name || selectedPair.quoteToken.symbol,
            decimals: selectedPair.quoteToken.decimals,
            verified: true,
            source: 'database' as const,
            logoUrl: (selectedPair.quoteToken as any).logoUrl,
        } : null,
        isSearching: false,
        showDropdown: false,
    });


    // Token search hooks
    const baseTokenSearch = useTokenSearch({
        chain,
        type: 'base',
        enabled: baseSelection.isSearching,
    });

    const quoteTokenSearch = useTokenSearch({
        chain,
        type: 'quote',
        enabled: quoteSelection.isSearching,
    });

    // Token pair validation - only validate if both tokens have addresses
    const validation = useTokenPairValidation(
        baseSelection.token?.address ? baseSelection.token as any : null,
        quoteSelection.token?.address ? quoteSelection.token as any : null
    );

    // Popular tokens
    const popularBaseTokens = getPopularTokens(chain, 'base');
    const popularQuoteTokens = getPopularTokens(chain, 'quote');

    // Handle base token search
    const handleBaseTokenSearch = useCallback((query: string) => {
        baseTokenSearch.setQuery(query);
        setBaseSelection(prev => ({
            ...prev,
            isSearching: query.length >= 3,
            showDropdown: query.length >= 3,
        }));
    }, [baseTokenSearch]);

    // Handle quote token search
    const handleQuoteTokenSearch = useCallback((query: string) => {
        quoteTokenSearch.setQuery(query);
        setQuoteSelection(prev => ({
            ...prev,
            isSearching: query.length >= 3,
            showDropdown: query.length >= 3,
        }));
    }, [quoteTokenSearch]);

    // Create and enrich individual tokens
    const createToken = useCallback(async (tokenAddress: string): Promise<TokenSearchResult | null> => {
        try {
            const response = await fetch('/api/tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chain,
                    address: tokenAddress,
                }),
            });

            if (!response.ok) {
                // Token creation failed but don't block user flow
                console.warn('Token creation failed:', response.statusText);
                return null;
            }

            const tokenResult = await response.json();

            if (tokenResult.success && tokenResult.token) {
                const token = tokenResult.token;
                return {
                    address: token.address,
                    symbol: token.symbol,
                    name: token.name,
                    decimals: token.decimals,
                    verified: token.verified,
                    logoUrl: token.logoUrl,
                    source: 'database' as const,
                };
            }

            return null;
        } catch (error) {
            // Token creation failed but don't block user flow
            console.warn('Token creation error:', error);
            return null;
        }
    }, [chain]);

    // Select base token and create/enrich it
    const selectBaseToken = useCallback(async (token: TokenSearchResult) => {
        setBaseSelection({
            token,
            isSearching: false,
            showDropdown: false,
        });
        baseTokenSearch.setQuery(token.symbol);
        baseTokenSearch.clearResults();

        // Create/enrich token immediately on selection
        if (token.address) {
            const enrichedToken = await createToken(token.address);
            if (enrichedToken) {
                setBaseSelection(prev => ({
                    ...prev,
                    token: enrichedToken
                }));
            }
        }
    }, [baseTokenSearch, createToken]);

    // Select quote token and create/enrich it
    const selectQuoteToken = useCallback(async (token: TokenSearchResult) => {
        setQuoteSelection({
            token,
            isSearching: false,
            showDropdown: false,
        });
        quoteTokenSearch.setQuery(token.symbol);
        quoteTokenSearch.clearResults();

        // Create/enrich token immediately on selection
        if (token.address) {
            const enrichedToken = await createToken(token.address);
            if (enrichedToken) {
                setQuoteSelection(prev => ({
                    ...prev,
                    token: enrichedToken
                }));
            }
        }
    }, [quoteTokenSearch, createToken]);

    // Update parent when both tokens are selected and valid
    useEffect(() => {
        if (baseSelection.token && quoteSelection.token && validation.isValid) {
            // Create a unique identifier for this token pair
            const pairId = `${baseSelection.token.address}-${quoteSelection.token.address}`;

            // Only notify parent if this is a different token pair than last time
            if (lastNotifiedPairRef.current !== pairId) {
                const tokenPair: TokenPair = {
                    baseToken: {
                        address: baseSelection.token.address,
                        symbol: baseSelection.token.symbol,
                        name: baseSelection.token.name,
                        decimals: baseSelection.token.decimals,
                    } as any, // Type conversion for compatibility
                    quoteToken: {
                        address: quoteSelection.token.address,
                        symbol: quoteSelection.token.symbol,
                        name: quoteSelection.token.name,
                        decimals: quoteSelection.token.decimals,
                    } as any, // Type conversion for compatibility
                    isValidPair: true,
                };
                onPairSelect(tokenPair);
                lastNotifiedPairRef.current = pairId;
            }
        } else {
            // Clear the ref when tokens are invalid/missing
            lastNotifiedPairRef.current = null;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseSelection.token, quoteSelection.token, validation.isValid]);

    return (
        <div className="space-y-6">
            <p className="text-slate-300">
                {t("positionWizard.tokenPair.description")}
            </p>

            {/* Base/Quote Explanation */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">
                    {t("positionWizard.tokenPair.explanation.title")}
                </h4>
                <div className="space-y-2 text-sm text-slate-300">
                    <p>
                        <span className="text-blue-400 font-medium">
                            {t("positionWizard.tokenPair.explanation.baseToken")}:
                        </span>{" "}
                        {t("positionWizard.tokenPair.explanation.baseDescription")}
                    </p>
                    <p>
                        <span className="text-green-400 font-medium">
                            {t("positionWizard.tokenPair.explanation.quoteToken")}:
                        </span>{" "}
                        {t("positionWizard.tokenPair.explanation.quoteDescription")}
                    </p>
                </div>
            </div>

            {/* Token Selection */}
            <div className="grid md:grid-cols-2 gap-6">
                <TokenInput
                    type="base"
                    selection={baseSelection}
                    query={baseTokenSearch.query}
                    chain={chain}
                    onQueryChange={handleBaseTokenSearch}
                    onTokenSelect={selectBaseToken}
                    searchHook={baseTokenSearch}
                    popularTokens={popularBaseTokens}
                    placeholder={t("positionWizard.tokenPair.searchPlaceholder")}
                    label={t("positionWizard.tokenPair.baseToken")}
                    color="text-blue-400"
                    onClearToken={() => {
                        setBaseSelection({ token: null, isSearching: false, showDropdown: false });
                        baseTokenSearch.setQuery('');
                    }}
                />

                <TokenInput
                    type="quote"
                    selection={quoteSelection}
                    query={quoteTokenSearch.query}
                    chain={chain}
                    onQueryChange={handleQuoteTokenSearch}
                    onTokenSelect={selectQuoteToken}
                    searchHook={quoteTokenSearch}
                    popularTokens={popularQuoteTokens}
                    placeholder={t("positionWizard.tokenPair.searchPlaceholder")}
                    label={t("positionWizard.tokenPair.quoteToken")}
                    color="text-green-400"
                    onClearToken={() => {
                        setQuoteSelection({ token: null, isSearching: false, showDropdown: false });
                        quoteTokenSearch.setQuery('');
                    }}
                />
            </div>

            {/* Validation Error */}
            {validation.error && baseSelection.token && quoteSelection.token && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <div>
                            <h5 className="text-red-400 font-medium">
                                {t("positionWizard.tokenPair.validationError")}
                            </h5>
                            <p className="text-red-200/80 text-sm mt-1">
                                {validation.error}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Note - matches chain selection step height */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">
                    {t("positionWizard.tokenPair.note")}
                </p>
            </div>

        </div>
    );
}