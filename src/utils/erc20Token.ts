import { Token } from "@uniswap/sdk-core";
import { EvmAddress, sameAddress } from "./evmAddress";
import { Config } from "wagmi";
import { readContract } from "viem/actions";
import { erc20Abi } from "viem";
import { getPublicClient } from "wagmi/actions";
import {
    defaultTokensByChain,
    loadTokenFromCustomList,
} from "./erc20TokenLists";

export type Erc20Token = {
    chainId: number;
    address: EvmAddress;
    name: string;
    symbol: string;
    decimals: number;
};

export function sameErc20Token(a: Erc20Token, b: Erc20Token): boolean {
    return sameAddress(a.address, b.address);
}

export function fromSdkToken(sdkToken: Token): Erc20Token {
    if (!sdkToken.name || !sdkToken.symbol) {
        throw new Error("fromSdkToken: name or symbol is undefined");
    }
    return {
        chainId: sdkToken.chainId,
        address: sdkToken.address as EvmAddress,
        name: sdkToken.name,
        symbol: sdkToken.symbol,
        decimals: sdkToken.decimals,
    };
}

export function toSdkToken(erc20Token: Erc20Token): Token {
    return new Token(
        erc20Token.chainId,
        erc20Token.address,
        erc20Token.decimals,
        erc20Token.symbol,
        erc20Token.name
    );
}

/**
 * Converts a Uniswap SDK Token object to an Erc20Token.
 *
 * @param {Token} sdkToken - The Uniswap SDK Token instance to convert.
 * @returns {Erc20Token} An Erc20Token object containing the chainId, address, name, symbol, and decimals.
 * @throws {Error} If the provided sdkToken does not have a name or symbol.
 *
 * @example
 * const sdkToken = new Token(1, "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", 6, "USDC", "USD Coin");
 * const erc20Token = fromSdkToken(sdkToken);
 * // erc20Token: { chainId: 1, address: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", name: "USD Coin", symbol: "USDC", decimals: 6 }
 */
export async function loadSdkToken(
    config: Config,
    chainId: number,
    address: EvmAddress
): Promise<Token> {
    const publicClient = getPublicClient(config, { chainId });
    if (!publicClient) {
        throw new Error(`No public client available for chainId ${chainId}`);
    }

    // Erweiterung: Erstes Element der defaultTokensByChain durchsuchen, falls nicht gefunden
    const defaultTokens = defaultTokensByChain(chainId);
    const found = defaultTokens.find(
        (t: Erc20Token) => t.address.toLowerCase() === address.toLowerCase()
    );
    if (found) return toSdkToken(found);

    const customToken = loadTokenFromCustomList(chainId, address);
    if (customToken) return toSdkToken(customToken);

    const [decimals, symbol, name] = await Promise.all([
        publicClient
            .readContract({
                address,
                abi: erc20Abi,
                functionName: "decimals",
            })
            .then((v: unknown) => {
                const n =
                    typeof v === "bigint" ? Number(v) : Number(v as number);
                if (!Number.isFinite(n)) throw new Error("Invalid decimals");
                return n;
            }),
        publicClient
            .readContract({
                address,
                abi: erc20Abi,
                functionName: "symbol",
            })
            .then((v: unknown) => String(v))
            .catch(() => undefined),
        publicClient
            .readContract({ address, abi: erc20Abi, functionName: "name" })
            .then((v: unknown) => String(v))
            .catch(() => undefined),
    ]);

    return new Token(chainId, address, decimals, symbol, name);
}
/**
 * Loads an Erc20Token object by fetching ERC20 metadata on-chain using wagmi/viem.
 *
 * - Returns an Erc20Token with correct chainId, address, decimals, symbol, and name.
 * - Throws if `decimals` cannot be fetched.
 *
 * @param config - The wagmi config object for the client.
 * @param chainId - The chain ID of the token.
 * @param address - The EVM address of the token.
 * @returns A Promise that resolves to an Erc20Token object.
 */
export async function loadErc20Token(
    config: Config,
    chainId: number,
    address: EvmAddress
): Promise<Erc20Token> {
    const sdkToken = await loadSdkToken(config, chainId, address);
    return fromSdkToken(sdkToken);
}
