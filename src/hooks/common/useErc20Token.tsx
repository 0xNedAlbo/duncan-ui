import { EvmAddress } from "@/utils/evmAddress";
import { Erc20Token } from "@/utils/erc20Token";
import { useReadContract } from "wagmi";
import { erc20Abi } from "viem";

export function useErc20Token(address: EvmAddress): Erc20Token | undefined {
    const { data: name } = useReadContract({
        address,
        abi: erc20Abi,
        functionName: "name",
    });
    const { data: symbol } = useReadContract({
        address,
        abi: erc20Abi,
        functionName: "symbol",
    });
    const { data: decimals } = useReadContract({
        address,
        abi: erc20Abi,
        functionName: "decimals",
    });
    if (!name || !symbol) return undefined;
    if (decimals === undefined) return undefined;
    return {
        address,
        name,
        symbol,
        decimals,
    };
}
