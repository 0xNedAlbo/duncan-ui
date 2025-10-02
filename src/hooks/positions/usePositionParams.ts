import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { SupportedChainsType } from "@/config/chains";
import { isValidChainSlug } from "@/config/chains";
import { isValidAddress, normalizeAddress } from "@/lib/utils/evm";

export interface PositionParams {
    chain: SupportedChainsType | undefined;
    poolAddress: string | undefined;
    baseToken: string | undefined;
    quoteToken: string | undefined;
    tickLower: number;
    tickUpper: number;
    liquidity: bigint | undefined;
}

/**
 * Hook to extract and validate position parameters from URL search params
 *
 * Validates and normalizes:
 * - Chain slug
 * - Pool address (EIP-55 checksum)
 * - Base/quote token addresses (EIP-55 checksum)
 * - Tick boundaries
 * - Liquidity amount
 *
 * @returns Validated position parameters
 */
export function usePositionParams(): PositionParams {
    const searchParams = useSearchParams();

    const [chain, setChain] = useState<SupportedChainsType | undefined>();
    const [poolAddress, setPoolAddress] = useState<string | undefined>();
    const [baseToken, setBaseToken] = useState<string | undefined>();
    const [quoteToken, setQuoteToken] = useState<string | undefined>();
    const [tickLower, setTickLower] = useState<number>(NaN);
    const [tickUpper, setTickUpper] = useState<number>(NaN);
    const [liquidity, setLiquidity] = useState<bigint | undefined>(0n);

    useEffect(() => {
        // Validate and set chain
        const chainParam = searchParams.get("chain") || "";
        const isValidChain = chainParam && isValidChainSlug(chainParam);
        setChain(isValidChain ? (chainParam as SupportedChainsType) : undefined);

        // Parse and set tick boundaries
        const tickLowerParam = parseInt(searchParams.get("tickLower") || "");
        setTickLower(tickLowerParam);

        const tickUpperParam = parseInt(searchParams.get("tickUpper") || "");
        setTickUpper(tickUpperParam);

        // Parse and set liquidity
        const liquidityParam = searchParams.get("liquidity");
        if (liquidityParam) {
            try {
                setLiquidity(BigInt(liquidityParam));
            } catch {
                setLiquidity(undefined);
            }
        } else {
            setLiquidity(undefined);
        }

        // Validate and normalize pool address
        const poolAddressParam = searchParams.get("poolAddress");
        if (poolAddressParam && isValidAddress(poolAddressParam)) {
            setPoolAddress(normalizeAddress(poolAddressParam));
        } else {
            setPoolAddress(undefined);
        }

        // Validate and normalize base token address
        const baseTokenParam = searchParams.get("baseToken");
        if (baseTokenParam && isValidAddress(baseTokenParam)) {
            setBaseToken(normalizeAddress(baseTokenParam));
        } else {
            setBaseToken(undefined);
        }

        // Validate and normalize quote token address
        const quoteTokenParam = searchParams.get("quoteToken");
        if (quoteTokenParam && isValidAddress(quoteTokenParam)) {
            setQuoteToken(normalizeAddress(quoteTokenParam));
        } else {
            setQuoteToken(undefined);
        }
    }, [searchParams]);

    return {
        chain,
        poolAddress,
        baseToken,
        quoteToken,
        tickLower,
        tickUpper,
        liquidity,
    };
}
