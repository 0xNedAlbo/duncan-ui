import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface PositionNavigationCallbacks {
    goToChainSelection: () => void;
    goToTokenPairSelection: () => void;
    goToPoolSelection: () => void;
    goToPositionConfig: () => void;
}

/**
 * Hook providing navigation callbacks for position wizard steps
 *
 * Handles URL parameter management when navigating between wizard steps:
 * - Step 1: Chain selection
 * - Step 2: Token pair selection
 * - Step 3: Pool selection
 * - Step 4: Position configuration
 *
 * @returns Navigation callback functions
 */
export function usePositionNavigation(): PositionNavigationCallbacks {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const goToChainSelection = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("step", "1");
        params.delete("chain");
        params.delete("baseToken");
        params.delete("quoteToken");
        params.delete("poolAddress");
        params.delete("tickLower");
        params.delete("tickUpper");
        params.delete("liquidity");
        router.push(pathname + "?" + params.toString());
    }, [router, pathname, searchParams]);

    const goToTokenPairSelection = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("step", "2");
        params.delete("baseToken");
        params.delete("quoteToken");
        params.delete("poolAddress");
        params.delete("tickLower");
        params.delete("tickUpper");
        params.delete("liquidity");
        router.push(pathname + "?" + params.toString());
    }, [router, pathname, searchParams]);

    const goToPoolSelection = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("step", "3");
        params.delete("poolAddress");
        params.delete("tickLower");
        params.delete("tickUpper");
        params.delete("liquidity");
        router.push(pathname + "?" + params.toString());
    }, [router, pathname, searchParams]);

    const goToPositionConfig = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("step", "4");
        router.push(pathname + "?" + params.toString());
    }, [router, pathname, searchParams]);

    return {
        goToChainSelection,
        goToTokenPairSelection,
        goToPoolSelection,
        goToPositionConfig,
    };
}
