import type { PublicClient } from "viem";
import type { SupportedChainsType } from "@/config/chains";
import { normalizeAddress, isValidAddress } from "@/lib/utils/evm";

// Standard ERC20 ABI for name, symbol, and decimals
const ERC20_ABI = [
    {
        constant: true,
        inputs: [],
        name: "name",
        outputs: [{ name: "", type: "string" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: true,
        inputs: [],
        name: "symbol",
        outputs: [{ name: "", type: "string" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: true,
        inputs: [],
        name: "decimals",
        outputs: [{ name: "", type: "uint8" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
] as const;

export interface OnChainTokenInfo {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    chain: string;
}

export interface OnChainTokenError {
    address: string;
    error: string;
    chain: string;
}

export class OnChainTokenService {
    private rpcClients: Map<SupportedChainsType, PublicClient>;

    constructor(rpcClients: Map<SupportedChainsType, PublicClient>) {
        this.rpcClients = rpcClients;
    }

    /**
     * Get token information from on-chain contract calls
     */
    async getTokenInfo(
        chain: SupportedChainsType,
        address: string
    ): Promise<OnChainTokenInfo> {
        // Validate inputs
        if (!isValidAddress(address)) {
            throw new Error(`Invalid address format: ${address}`);
        }

        const normalizedAddress = normalizeAddress(address);
        const client = this.rpcClients.get(chain);

        if (!client) {
            throw new Error(`No RPC client available for chain: ${chain}`);
        }

        try {
            // Make parallel calls for efficiency
            const [nameResult, symbolResult, decimalsResult] = await Promise.allSettled([
                client.readContract({
                    address: normalizedAddress as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: "name",
                }),
                client.readContract({
                    address: normalizedAddress as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: "symbol",
                }),
                client.readContract({
                    address: normalizedAddress as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: "decimals",
                }),
            ]);

            // Extract results and handle errors
            const name = this.extractResult(nameResult, "name");
            const symbol = this.extractResult(symbolResult, "symbol");
            const decimals = this.extractResult(decimalsResult, "decimals");

            // Validate required fields
            if (!name || !symbol || typeof decimals !== "number") {
                throw new Error("Token is missing required metadata (name, symbol, or decimals)");
            }

            // Validate decimals range
            if (decimals < 1 || decimals > 18) {
                throw new Error(`Invalid decimals value: ${decimals}. Must be between 1-18`);
            }

            return {
                address: normalizedAddress,
                name: name.trim(),
                symbol: symbol.trim(),
                decimals,
                chain,
            };
        } catch (error) {
            // Handle contract call errors
            if (error instanceof Error) {
                throw new Error(`Failed to fetch token info for ${normalizedAddress}: ${error.message}`);
            }
            throw new Error(`Failed to fetch token info for ${normalizedAddress}: Unknown error`);
        }
    }

    /**
     * Get token information for multiple addresses in parallel
     */
    async getTokenInfoBatch(
        chain: SupportedChainsType,
        addresses: string[]
    ): Promise<{
        success: OnChainTokenInfo[];
        errors: OnChainTokenError[];
    }> {
        const results = await Promise.allSettled(
            addresses.map(address => this.getTokenInfo(chain, address))
        );

        const success: OnChainTokenInfo[] = [];
        const errors: OnChainTokenError[] = [];

        results.forEach((result, index) => {
            const address = addresses[index];
            if (result.status === "fulfilled") {
                success.push(result.value);
            } else {
                errors.push({
                    address,
                    error: result.reason?.message || "Unknown error",
                    chain,
                });
            }
        });

        return { success, errors };
    }

    /**
     * Check if an address is likely an ERC20 token
     * This is a basic check - it tries to call the symbol() function
     */
    async isERC20Token(
        chain: SupportedChainsType,
        address: string
    ): Promise<boolean> {
        if (!isValidAddress(address)) {
            return false;
        }

        const client = this.rpcClients.get(chain);
        if (!client) {
            return false;
        }

        try {
            const normalizedAddress = normalizeAddress(address);

            // Try to call symbol() - if it succeeds, likely an ERC20 token
            await client.readContract({
                address: normalizedAddress as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "symbol",
            });

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Helper to extract results from Promise.allSettled results
     */
    private extractResult(
        result: PromiseSettledResult<unknown>,
        fieldName: string
    ): any {
        if (result.status === "fulfilled") {
            return result.value;
        } else {
            throw new Error(`Failed to fetch ${fieldName}: ${result.reason}`);
        }
    }
}