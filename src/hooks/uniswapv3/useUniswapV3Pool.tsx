import { useCallback, useEffect, useRef, useState } from "react";
import type { Config } from "wagmi";
import { EvmAddress } from "@/utils/evmAddress";
import {
    UniswapV3Pool,
    buildProjectPoolFromSdk,
    loadSdkPool,
} from "@/utils/uniswapV3/uniswapV3Pool";

/**
 * React hook to load a Uniswap V3 pool's data as UniswapV3Pool.
 *
 * Returns { data, isLoading, error, refetch }.
 * `data` is undefined until loaded or on error.
 */
export function useUniswapV3Pool(
    config: Config | undefined,
    chainId: number | undefined,
    poolAddress: EvmAddress | undefined,
    baseToken: EvmAddress | undefined,
    quoteToken: EvmAddress | undefined,
    options: { enabled?: boolean } = {}
): {
    data?: UniswapV3Pool;
    isLoading: boolean;
    error?: Error;
    refetch: () => Promise<void>;
} {
    const { enabled = true } = options;

    const [data, setData] = useState<UniswapV3Pool | undefined>(undefined);
    const [error, setError] = useState<Error | undefined>(undefined);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Prevent race conditions on rapid prop changes/unmounts
    const callIdRef = useRef(0);

    const canFetch =
        Boolean(config) &&
        typeof chainId === "number" &&
        chainId >= 0 &&
        Boolean(poolAddress) &&
        Boolean(baseToken) &&
        Boolean(quoteToken) &&
        enabled;

    const refetch = useCallback(async () => {
        if (!canFetch) return;
        const callId = ++callIdRef.current;
        setIsLoading(true);
        setError(undefined);

        try {
            // Load the SDK pool
            const sdkPool = await loadSdkPool(
                config as Config,
                chainId as number,
                poolAddress as EvmAddress
            );
            // Build the project-level pool object
            const projectPool = buildProjectPoolFromSdk({
                sdkPool,
                baseToken: baseToken as EvmAddress,
                quoteToken: quoteToken as EvmAddress,
            });
            if (callIdRef.current === callId) {
                setData(projectPool);
            }
        } catch (e) {
            if (callIdRef.current === callId) {
                setData(undefined);
                setError(e as Error);
            }
        } finally {
            if (callIdRef.current === callId) {
                setIsLoading(false);
            }
        }
    }, [canFetch, config, chainId, poolAddress, baseToken, quoteToken]);

    useEffect(() => {
        if (canFetch) refetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refetch]);

    return { data, isLoading, error, refetch };
}
