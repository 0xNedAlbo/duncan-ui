"use client";

import { useTranslations } from "@/i18n/client";
import { PositionEvent } from "@/types/api";
import { formatFractionHuman, FORMAT_PRESET_EN, FORMAT_PRESET_DE } from "@/lib/utils/fraction-format";
import { useSettingsStore } from "@/store/settings-store";
import { ExternalLink, Clock } from "lucide-react";

interface EventsTableProps {
    events: PositionEvent[];
    isLoading?: boolean;
    chainSlug?: string;
}

export function EventsTable({ events, isLoading, chainSlug = 'arbitrum' }: EventsTableProps) {
    const t = useTranslations();
    const { locale } = useSettingsStore();
    // Convert settings store locale format to simple string for formatting
    const localeString = locale === 'de-DE' ? 'de' : 'en';
    const formatPreset = localeString === 'de' ? FORMAT_PRESET_DE : FORMAT_PRESET_EN;

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
                    <p className="text-lg">{t("positionDetails.events.noEvents")}</p>
                    <p className="text-sm mt-2">
                        This position may be new or events may still be syncing.
                    </p>
                </div>
            </div>
        );
    }

    const formatTokenAmount = (amount: string, decimals: number = 18): string => {
        if (!amount || amount === '0') return '0';
        try {
            const bigintAmount = BigInt(amount);
            const fraction = {
                num: bigintAmount,
                den: BigInt(10) ** BigInt(decimals)
            };
            return formatFractionHuman(fraction, formatPreset);
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
        return date.toLocaleDateString(localeString, dateOptions);
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
                    {t("positionDetails.events.title")}
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                    {t("positionDetails.events.description")}
                </p>
                <div className="text-xs text-slate-500 mt-2">
                    {t("positionDetails.events.totalEvents")}: {events.length}
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-700/30">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                {t("positionDetails.events.columns.datetime")}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                {t("positionDetails.events.columns.eventType")}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                {t("positionDetails.events.columns.value")}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                {t("positionDetails.events.columns.details")}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                {t("positionDetails.events.columns.transaction")}
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
                                    <div className="flex items-center space-x-2">
                                        <span className="text-lg">{getEventTypeIcon(event.eventType)}</span>
                                        <span className={`text-sm font-medium ${getEventTypeColor(event.eventType)}`}>
                                            {t(`positionDetails.events.eventTypes.${event.eventType}`)}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-300">
                                    <div className="space-y-1">
                                        {event.eventType === 'COLLECT' && event.feeValueInQuote ? (
                                            <div className="text-purple-400 font-medium">
                                                ${formatTokenAmount(event.feeValueInQuote, 6)}
                                            </div>
                                        ) : (
                                            <div className="font-medium">
                                                ${formatTokenAmount(event.valueInQuote, 6)}
                                            </div>
                                        )}
                                        <div className="text-xs text-slate-500">
                                            {t(`positionDetails.events.confidence.${event.confidence}`)} • 
                                            {t(`positionDetails.events.source.${event.source}`)}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-400">
                                    <div className="space-y-1">
                                        {event.liquidityDelta !== '0' && (
                                            <div>
                                                Liquidity: {event.liquidityDelta.startsWith('-') ? '' : '+'}
                                                {formatTokenAmount(event.liquidityDelta.replace('-', ''), 18)}
                                            </div>
                                        )}
                                        {event.token0Delta !== '0' && (
                                            <div>Token0: {formatTokenAmount(event.token0Delta, 18)}</div>
                                        )}
                                        {event.token1Delta !== '0' && (
                                            <div>Token1: {formatTokenAmount(event.token1Delta, 6)}</div>
                                        )}
                                        {event.eventType === 'COLLECT' && event.collectedFee0 && (
                                            <div className="text-purple-400">
                                                Fee0: {formatTokenAmount(event.collectedFee0, 18)}
                                            </div>
                                        )}
                                        {event.eventType === 'COLLECT' && event.collectedFee1 && (
                                            <div className="text-purple-400">
                                                Fee1: {formatTokenAmount(event.collectedFee1, 6)}
                                            </div>
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
                            <div className="flex items-center space-x-2">
                                <span className="text-lg">{getEventTypeIcon(event.eventType)}</span>
                                <span className={`text-sm font-medium ${getEventTypeColor(event.eventType)}`}>
                                    {t(`positionDetails.events.eventTypes.${event.eventType}`)}
                                </span>
                            </div>
                            <div className="text-xs text-slate-400">
                                {formatDateTime(event.timestamp)}
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-white font-medium">
                                    ${formatTokenAmount(event.valueInQuote, 6)}
                                </div>
                                <div className="text-xs text-slate-500">
                                    {t(`positionDetails.events.confidence.${event.confidence}`)} • 
                                    {t(`positionDetails.events.source.${event.source}`)}
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

                        {(event.liquidityDelta !== '0' || event.token0Delta !== '0' || event.token1Delta !== '0') && (
                            <div className="text-xs text-slate-400 space-y-1">
                                {event.liquidityDelta !== '0' && (
                                    <div>Liquidity: {formatTokenAmount(event.liquidityDelta, 18)}</div>
                                )}
                                {event.token0Delta !== '0' && (
                                    <div>Token0: {formatTokenAmount(event.token0Delta, 18)}</div>
                                )}
                                {event.token1Delta !== '0' && (
                                    <div>Token1: {formatTokenAmount(event.token1Delta, 6)}</div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}