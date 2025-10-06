"use client";

import { useTranslations } from "@/app-shared/i18n/client";
import { PositionEvent } from "@/types/api";
import { formatCompactValue } from "@/lib/utils/fraction-format";
import { useSettingsStore } from "@/store/settings-store";
import { ExternalLink, Clock } from "lucide-react";
import Image from "next/image";
import type { TokenData } from "@/services/positions/positionService";

interface EventsTableProps {
    events: PositionEvent[];
    isLoading?: boolean;
    chainSlug?: string;
    quoteToken?: {
        symbol: string;
        decimals: number;
    };
    token0?: TokenData;
    token1?: TokenData;
}

export function EventsTable({ events, isLoading, chainSlug = 'arbitrum', quoteToken, token0, token1 }: EventsTableProps) {
    const t = useTranslations();
    const { locale } = useSettingsStore();

    if (isLoading) {
        return (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-slate-700 rounded w-1/3"></div>
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-slate-700/30 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 text-center">
                <div className="text-slate-400 mb-4">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg">{t("positionDetails.ledger.noEvents")}</p>
                    <p className="text-sm mt-2">
                        This position may be new or events may still be syncing.
                    </p>
                </div>
            </div>
        );
    }

    const formatValue = (amount: string, decimals: number = 6): string => {
        if (!amount || amount === '0') return '0';
        try {
            const bigintAmount = BigInt(amount);
            return formatCompactValue(bigintAmount, decimals);
        } catch {
            return amount;
        }
    };

    const formatDateTime = (timestamp: string): string => {
        const date = new Date(timestamp);
        const dateOptions: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        const localeString = locale === 'de-DE' ? 'de' : 'en';
        return date.toLocaleDateString(localeString, dateOptions);
    };

    const renderTokenAmount = (amount: string, token: TokenData | undefined, decimals: number) => {
        if (!amount || amount === '0' || !token) return null;

        return (
            <div className="flex items-center gap-2">
                {token.logoUrl && (
                    <Image
                        src={token.logoUrl}
                        alt={token.symbol}
                        width={16}
                        height={16}
                        className="rounded-full"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                )}
                <span>{formatValue(amount, decimals)} {token.symbol}</span>
            </div>
        );
    };

    const renderPrincipalAmount = (amount: string, token: TokenData | undefined, decimals: number) => {
        if (!amount || amount === '0' || !token) return null;

        return (
            <div className="flex items-center gap-2 text-orange-400">
                {token.logoUrl && (
                    <Image
                        src={token.logoUrl}
                        alt={token.symbol}
                        width={16}
                        height={16}
                        className="rounded-full"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                )}
                <span>{t('positionDetails.ledger.valueDisplay.principal')}: {formatValue(amount, decimals)} {token.symbol}</span>
            </div>
        );
    };

    const renderFeeAmount = (amount: string, token: TokenData | undefined, decimals: number) => {
        if (!amount || amount === '0' || !token) return null;

        return (
            <div className="flex items-center gap-2 text-purple-400">
                {token.logoUrl && (
                    <Image
                        src={token.logoUrl}
                        alt={token.symbol}
                        width={16}
                        height={16}
                        className="rounded-full"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                )}
                <span>{t('positionDetails.ledger.valueDisplay.fees')}: {formatValue(amount, decimals)} {token.symbol}</span>
            </div>
        );
    };

    const calculateCollectedPrincipal = (tokenDelta: string, collectedFee: string | undefined): string => {
        if (!tokenDelta || tokenDelta === '0' || collectedFee === undefined) return '0';

        try {
            const total = BigInt(tokenDelta);
            const fees = BigInt(collectedFee || '0');
            const principal = total - fees;
            return principal > 0n ? principal.toString() : '0';
        } catch {
            return '0';
        }
    };

    const hasPrincipalWithdrawal = (event: PositionEvent): boolean => {
        if (event.eventType !== 'COLLECT') return false;
        const principal0 = calculateCollectedPrincipal(event.token0Delta, event.collectedFee0);
        const principal1 = calculateCollectedPrincipal(event.token1Delta, event.collectedFee1);
        return principal0 !== '0' || principal1 !== '0';
    };

    const getEventTypeColor = (eventType: PositionEvent['eventType']): string => {
        switch (eventType) {
            case 'CREATE': return 'text-green-400';
            case 'INCREASE': return 'text-blue-400';
            case 'DECREASE': return 'text-orange-400';
            case 'COLLECT': return 'text-purple-400';
            case 'CLOSE': return 'text-red-400';
            default: return 'text-slate-400';
        }
    };

    const getEventTypeIcon = (eventType: PositionEvent['eventType']): string => {
        switch (eventType) {
            case 'CREATE': return '🎯';
            case 'INCREASE': return '📈';
            case 'DECREASE': return '📉';
            case 'COLLECT': return '💰';
            case 'CLOSE': return '🔒';
            default: return '📊';
        }
    };

    const getExplorerUrl = (chain: string, txHash: string): string => {
        const baseUrls = {
            ethereum: 'https://etherscan.io/tx/',
            arbitrum: 'https://arbiscan.io/tx/',
            base: 'https://basescan.org/tx/'
        };
        return (baseUrls[chain as keyof typeof baseUrls] || baseUrls.ethereum) + txHash;
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-700/50">
                <h3 className="text-lg font-semibold text-white">
                    {t("positionDetails.ledger.title")}
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                    {t("positionDetails.ledger.description")}
                </p>
                <div className="text-xs text-slate-500 mt-2">
                    {t("positionDetails.ledger.totalEvents")}: {events.length}
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-700/30">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                {t("positionDetails.ledger.columns.datetime")}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                {t("positionDetails.ledger.columns.eventType")}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                {t("positionDetails.ledger.columns.value")}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                {t("positionDetails.ledger.columns.details")}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                {t("positionDetails.ledger.columns.transaction")}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                        {events.map((event) => (
                            <tr key={event.id} className="hover:bg-slate-700/20 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                    {formatDateTime(event.timestamp)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="space-y-1">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-lg">{getEventTypeIcon(event.eventType)}</span>
                                            <span className={`text-sm font-medium ${getEventTypeColor(event.eventType)}`}>
                                                {t(`positionDetails.ledger.eventTypes.${event.eventType}`)}
                                            </span>
                                        </div>
                                        {hasPrincipalWithdrawal(event) && (
                                            <div className="text-xs text-orange-400 ml-7">
                                                {t('positionDetails.ledger.valueDisplay.principalWithdrawal')}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-300">
                                    <div className="space-y-1">
                                        {event.eventType === 'COLLECT' && event.feeValueInQuote ? (
                                            <div className="text-purple-400 font-medium">
                                                {formatValue(event.feeValueInQuote, quoteToken?.decimals || 6)} {quoteToken?.symbol || ''}
                                            </div>
                                        ) : (
                                            <div className="font-medium">
                                                {formatValue(event.valueInQuote, quoteToken?.decimals || 6)} {quoteToken?.symbol || ''}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-400">
                                    <div className="space-y-1">
                                        {event.eventType === 'COLLECT' ? (
                                            <>
                                                {/* Show fees first */}
                                                {event.collectedFee0 && event.collectedFee0 !== '0' && renderFeeAmount(event.collectedFee0, token0, token0?.decimals || 18)}
                                                {event.collectedFee1 && event.collectedFee1 !== '0' && renderFeeAmount(event.collectedFee1, token1, token1?.decimals || 6)}
                                                {/* Show principal amounts */}
                                                {(() => {
                                                    const principal0 = calculateCollectedPrincipal(event.token0Delta, event.collectedFee0);
                                                    const principal1 = calculateCollectedPrincipal(event.token1Delta, event.collectedFee1);
                                                    return (
                                                        <>
                                                            {principal0 !== '0' && renderPrincipalAmount(principal0, token0, token0?.decimals || 18)}
                                                            {principal1 !== '0' && renderPrincipalAmount(principal1, token1, token1?.decimals || 6)}
                                                        </>
                                                    );
                                                })()}
                                            </>
                                        ) : (
                                            <>
                                                {renderTokenAmount(event.token0Delta, token0, token0?.decimals || 18)}
                                                {renderTokenAmount(event.token1Delta, token1, token1?.decimals || 6)}
                                            </>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <div className="space-y-1">
                                        <a
                                            href={getExplorerUrl(chainSlug, event.transactionHash)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors"
                                        >
                                            <span className="font-mono text-xs">
                                                {event.transactionHash.slice(0, 8)}...{event.transactionHash.slice(-6)}
                                            </span>
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                        <div className="text-xs text-slate-500">
                                            Block: {event.blockNumber.toLocaleString()}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-slate-700/30">
                {events.map((event) => (
                    <div key={event.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                    <span className="text-lg">{getEventTypeIcon(event.eventType)}</span>
                                    <span className={`text-sm font-medium ${getEventTypeColor(event.eventType)}`}>
                                        {t(`positionDetails.ledger.eventTypes.${event.eventType}`)}
                                    </span>
                                </div>
                                {hasPrincipalWithdrawal(event) && (
                                    <div className="text-xs text-orange-400 ml-7">
                                        {t('positionDetails.ledger.valueDisplay.principalWithdrawal')}
                                    </div>
                                )}
                            </div>
                            <div className="text-xs text-slate-400">
                                {formatDateTime(event.timestamp)}
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-white font-medium">
                                    {formatValue(event.valueInQuote, quoteToken?.decimals || 6)} {quoteToken?.symbol || ''}
                                </div>
                            </div>
                            <a
                                href={getExplorerUrl(chainSlug, event.transactionHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <span className="font-mono text-xs">
                                    {event.transactionHash.slice(0, 6)}...
                                </span>
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>

                        {(event.token0Delta !== '0' || event.token1Delta !== '0' || (event.eventType === 'COLLECT' && (event.collectedFee0 || event.collectedFee1))) && (
                            <div className="text-xs text-slate-400 space-y-1">
                                {event.eventType === 'COLLECT' ? (
                                    <>
                                        {/* Show fees first */}
                                        {event.collectedFee0 && event.collectedFee0 !== '0' && renderFeeAmount(event.collectedFee0, token0, token0?.decimals || 18)}
                                        {event.collectedFee1 && event.collectedFee1 !== '0' && renderFeeAmount(event.collectedFee1, token1, token1?.decimals || 6)}
                                        {/* Show principal amounts */}
                                        {(() => {
                                            const principal0 = calculateCollectedPrincipal(event.token0Delta, event.collectedFee0);
                                            const principal1 = calculateCollectedPrincipal(event.token1Delta, event.collectedFee1);
                                            return (
                                                <>
                                                    {principal0 !== '0' && renderPrincipalAmount(principal0, token0, token0?.decimals || 18)}
                                                    {principal1 !== '0' && renderPrincipalAmount(principal1, token1, token1?.decimals || 6)}
                                                </>
                                            );
                                        })()}
                                    </>
                                ) : (
                                    <>
                                        {renderTokenAmount(event.token0Delta, token0, token0?.decimals || 18)}
                                        {renderTokenAmount(event.token1Delta, token1, token1?.decimals || 6)}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}