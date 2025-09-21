"use client";

import { useState } from "react";
import { Copy, ExternalLink, Check } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import type { BasicPosition } from "@/services/positions/positionService";
import { getChainConfig } from "@/config/chains";
import {
    NONFUNGIBLE_POSITION_MANAGER_ADDRESSES,
    getChainId,
} from "@/lib/contracts/nonfungiblePositionManager";
import { tickToSqrtRatioX96 } from "@/lib/utils/uniswap-v3/price";

interface TechnicalDetailsProps {
    position: BasicPosition;
    chainSlug: string;
}

interface CopyableFieldProps {
    label: string;
    value: string;
    href?: string;
    isAddress?: boolean;
}

interface DisplayFieldProps {
    label: string;
    value: string;
}

function CopyableField({
    label,
    value,
    href,
    isAddress = false,
}: CopyableFieldProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-2">
            <div className="text-sm font-medium text-slate-300">{label}</div>
            <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <span
                    className={`font-mono text-sm flex-1 text-white ${
                        isAddress ? "break-all" : ""
                    }`}
                >
                    {value}
                </span>
                <div className="flex items-center gap-1">
                    {href && (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-slate-700/50 rounded transition-colors"
                            title="View on explorer"
                        >
                            <ExternalLink className="w-4 h-4 text-slate-400" />
                        </a>
                    )}
                    <button
                        onClick={handleCopy}
                        className="p-1.5 hover:bg-slate-700/50 rounded transition-colors"
                        title="Copy to clipboard"
                    >
                        {copied ? (
                            <Check className="w-4 h-4 text-green-400" />
                        ) : (
                            <Copy className="w-4 h-4 text-slate-400" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function DisplayField({ label, value }: DisplayFieldProps) {
    return (
        <div className="space-y-2">
            <div className="text-sm font-medium text-slate-300">{label}</div>
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <span className="font-mono text-sm text-white">
                    {value}
                </span>
            </div>
        </div>
    );
}

export function TechnicalDetails({
    position,
    chainSlug,
}: TechnicalDetailsProps) {
    const t = useTranslations();
    const chainConfig = getChainConfig(chainSlug);


    // Contract addresses
    const chainId = getChainId(chainSlug);
    const nfPositionManagerAddress =
        NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId] || "";
    const poolAddress = position.pool?.poolAddress || "";
    const ownerAddress = position.owner || "";

    // Explorer URLs
    const explorerUrl = chainConfig?.explorer;
    const nfPositionManagerUrl = explorerUrl
        ? `${explorerUrl}/address/${nfPositionManagerAddress}`
        : undefined;
    const poolUrl = explorerUrl
        ? `${explorerUrl}/address/${poolAddress}`
        : undefined;
    const ownerUrl = explorerUrl
        ? `${explorerUrl}/address/${ownerAddress}`
        : undefined;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4">
                        {t("positionDetails.technical.basicInfo")}
                    </h3>

                    <CopyableField
                        label={t("positionDetails.technical.poolContract")}
                        value={poolAddress}
                        href={poolUrl}
                        isAddress={true}
                    />

                    <CopyableField
                        label={t("positionDetails.technical.token0")}
                        value={position.pool?.token0?.address || ""}
                        href={explorerUrl ? `${explorerUrl}/token/${position.pool?.token0?.address}` : undefined}
                        isAddress={true}
                    />

                    <CopyableField
                        label={t("positionDetails.technical.token1")}
                        value={position.pool?.token1?.address || ""}
                        href={explorerUrl ? `${explorerUrl}/token/${position.pool?.token1?.address}` : undefined}
                        isAddress={true}
                    />

                    <CopyableField
                        label={t("positionDetails.technical.fee")}
                        value={position.pool?.fee?.toString() || ""}
                    />

                    {position.pool?.currentPrice && (
                        <CopyableField
                            label={t("positionDetails.technical.currentPrice")}
                            value={BigInt(position.pool.currentPrice).toString()}
                        />
                    )}

                    {position.pool?.currentTick !== undefined && (
                        <CopyableField
                            label={t("positionDetails.technical.sqrtRatioX96")}
                            value={tickToSqrtRatioX96(position.pool.currentTick).toString()}
                        />
                    )}

                    {position.pool?.currentTick !== undefined && (
                        <CopyableField
                            label={t("positionDetails.technical.currentTick")}
                            value={position.pool.currentTick.toString()}
                        />
                    )}

                    <CopyableField
                        label={t("positionDetails.technical.tickSpacing")}
                        value={position.pool?.tickSpacing?.toString() || ""}
                    />
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4">
                        {t("positionDetails.technical.positionData")}
                    </h3>

                    <CopyableField
                        label={t("positionDetails.technical.nftId")}
                        value={position.nftId?.toString() || ""}
                    />

                    <DisplayField
                        label={t("positionDetails.technical.token0Role")}
                        value={position.token0IsQuote ? "Quote Token" : "Base Token"}
                    />

                    <DisplayField
                        label={t("positionDetails.technical.token1Role")}
                        value={position.token0IsQuote ? "Base Token" : "Quote Token"}
                    />

                    <CopyableField
                        label={t("positionDetails.technical.liquidity")}
                        value={
                            position.liquidity
                                ? BigInt(position.liquidity).toString()
                                : "0"
                        }
                    />

                    <CopyableField
                        label={t("positionDetails.technical.tickLower")}
                        value={position.tickLower?.toString() || ""}
                    />

                    <CopyableField
                        label={t("positionDetails.technical.tickUpper")}
                        value={position.tickUpper?.toString() || ""}
                    />

                    <CopyableField
                        label={t("positionDetails.technical.nfPositionManager")}
                        value={nfPositionManagerAddress}
                        href={nfPositionManagerUrl}
                        isAddress={true}
                    />

                    <CopyableField
                        label={t("positionDetails.technical.owner")}
                        value={ownerAddress}
                        href={ownerUrl}
                        isAddress={true}
                    />

                </div>
            </div>
        </div>
    );
}
