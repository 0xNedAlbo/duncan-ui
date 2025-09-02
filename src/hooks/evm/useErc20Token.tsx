import { Erc20Token, loadErc20Token } from "@/utils/erc20Token";
import { EvmAddress } from "@/utils/evmAddress";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Config } from "wagmi";

type UseErc20TokenOptions = {
    /** Auto-fetch on mount and when deps change (default: true) */
    enabled?: boolean;
};

/**
 * React hook to load an ERC20 token's metadata as Erc20Token.
 *
 * Returns { data, isLoading, error, refetch }.
 * `data` is undefined until loaded or on error.
 */
export function useErc20Token(
    config: Config | undefined,
    chainId: number | undefined,
    address: EvmAddress | undefined,
    options: UseErc20TokenOptions = {}
): {
    data?: Erc20Token;
    isLoading: boolean;
    error?: Error;
    refetch: () => Promise<void>;
} {
    const { enabled = true } = options;

    const [data, setData] = useState<Erc20Token | undefined>(undefined);
    const [error, setError] = useState<Error | undefined>(undefined);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Prevent race conditions on rapid prop changes/unmounts
    const callIdRef = useRef(0);

    const canFetch =
        Boolean(config) &&
        typeof chainId === "number" &&
        chainId >= 0 &&
        Boolean(address) &&
        enabled;

    const refetch = useCallback(async () => {
        if (!canFetch) return;
        const callId = ++callIdRef.current;
        setIsLoading(true);
        setError(undefined);

        try {
            const token = await loadErc20Token(
                config as Config,
                chainId as number,
                address as EvmAddress
            );
            if (callIdRef.current === callId) {
                setData(token);
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
    }, [canFetch, config, chainId, address]);

    useEffect(() => {
        if (canFetch) refetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refetch]);

    return { data, isLoading, error, refetch };
}
