/**
 * Position Import Service
 *
 * Handles importing Uniswap V3 positions from blockchain data via RPC calls.
 * Imports positions by NFT ID and creates database records.
 */

import { type PublicClient } from "viem";

import { type SupportedChainsType } from "@/config/chains";
import { NONFUNGIBLE_POSITION_MANAGER_ABI } from "@/lib/contracts/nonfungiblePositionManager";
import { PrismaClient } from "@prisma/client";
import { PoolService } from "../pools/poolService";
import { PositionService } from "./positionService";
import type { Services } from "../ServiceFactory";
import type { Clients } from "../ClientsFactory";

// Contract addresses for Uniswap V3 NFT Position Manager
const NFT_MANAGER_ADDRESSES = {
    ethereum: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    arbitrum: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    base: "0x03a520b32C04BF3bEEf7BF5d4f1D4b32E76a7d2f",
} as const;

// Imported position data structure
export interface ImportedPositionData {
    nftId: string;
    poolAddress: string;
    tickLower: number;
    tickUpper: number;
    liquidity: string;
    token0Address: string;
    token1Address: string;
    fee: number;
    chain: SupportedChainsType;
    owner: string;
}

// Import result
export interface PositionImportResult {
    success: boolean;
    positionId?: string;
    message: string;
    data?: ImportedPositionData;
}

export class PositionImportService {
    private prisma: PrismaClient;
    private rpcClients: Map<SupportedChainsType, PublicClient>;
    private pools: PoolService;
    private positions: PositionService;

    constructor(
        requiredClients: Pick<Clients, 'prisma' | 'rpcClients'>,
        requiredServices: Pick<Services, 'positionService' | 'poolService'>
    ) {
        this.prisma = requiredClients.prisma;
        this.rpcClients = requiredClients.rpcClients;
        this.positions = requiredServices.positionService;
        this.pools = requiredServices.poolService;
    }

    /**
     * Import position for user by NFT ID using RPC calls
     */
    async importPositionForUserByNftId(
        userId: string,
        nftId: string,
        chain: SupportedChainsType
    ): Promise<PositionImportResult> {
        try {
            // Validate inputs
            if (!userId || !nftId || !chain) {
                throw new Error(
                    "Missing required parameters: userId, nftId, or chain"
                );
            }

            const client = this.rpcClients.get(chain);
            if (!client) {
                throw new Error(`No RPC client available for chain: ${chain}`);
            }

            const nftManagerAddress = NFT_MANAGER_ADDRESSES[chain];
            if (!nftManagerAddress) {
                throw new Error(
                    `NFT Manager address not configured for chain: ${chain}`
                );
            }

            // Step 1: Get position data from NFT Manager
            const positionData = await this.getPositionFromNft(
                client,
                nftManagerAddress,
                BigInt(nftId)
            );

            // Step 2: Get pool information
            const poolData = await this.pools.findOrCreatePool(
                chain,
                positionData.token0,
                positionData.token1,
                positionData.fee,
                userId
            );

            // Step 3: Verify user exists
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                throw new Error(`User with ID ${userId} not found`);
            }

            // Step 4: Create imported position data structure
            const importedData: ImportedPositionData = {
                nftId: nftId,
                poolAddress: poolData.poolAddress.toLowerCase(),
                tickLower: positionData.tickLower,
                tickUpper: positionData.tickUpper,
                liquidity: positionData.liquidity.toString(),
                token0Address: positionData.token0.toLowerCase(),
                token1Address: positionData.token1.toLowerCase(),
                fee: positionData.fee,
                chain,
                owner: positionData.owner.toLowerCase(),
            };

            // Step 5: Save position to database
            const savedPosition = await this.savePositionToDatabase(
                userId,
                importedData
            );

            return {
                success: true,
                positionId: savedPosition.id,
                message: `Successfully imported position NFT ${nftId} for user ${userId}`,
                data: importedData,
            };
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Unknown error occurred";

            return {
                success: false,
                message: `Failed to import position NFT ${nftId}: ${errorMessage}`,
            };
        }
    }

    /**
     * Get the last event block number for a position using Uniswap V3 position events
     */
    private async getLastEventBlockNumber(
        client: PublicClient,
        nftManagerAddress: string,
        nftId: bigint
    ): Promise<bigint | null> {
        try {
            const currentBlock = await client.getBlockNumber();

            // Look back approximately 90 days (assuming ~12 second blocks)
            const blocksToLookBack = (90n * 24n * 60n * 60n) / 12n;
            const fromBlock =
                currentBlock > blocksToLookBack
                    ? currentBlock - blocksToLookBack
                    : 0n;

            // Get all position-related events for this NFT ID
            const [increaseEvents, decreaseEvents, collectEvents] =
                await Promise.all([
                    // IncreaseLiquidity events
                    client.getLogs({
                        address: nftManagerAddress as `0x${string}`,
                        event: {
                            type: "event",
                            name: "IncreaseLiquidity",
                            inputs: [
                                {
                                    name: "tokenId",
                                    type: "uint256",
                                    indexed: true,
                                },
                                {
                                    name: "liquidity",
                                    type: "uint128",
                                    indexed: false,
                                },
                                {
                                    name: "amount0",
                                    type: "uint256",
                                    indexed: false,
                                },
                                {
                                    name: "amount1",
                                    type: "uint256",
                                    indexed: false,
                                },
                            ],
                        },
                        args: { tokenId: nftId },
                        fromBlock,
                        toBlock: currentBlock,
                    }),

                    // DecreaseLiquidity events
                    client.getLogs({
                        address: nftManagerAddress as `0x${string}`,
                        event: {
                            type: "event",
                            name: "DecreaseLiquidity",
                            inputs: [
                                {
                                    name: "tokenId",
                                    type: "uint256",
                                    indexed: true,
                                },
                                {
                                    name: "liquidity",
                                    type: "uint128",
                                    indexed: false,
                                },
                                {
                                    name: "amount0",
                                    type: "uint256",
                                    indexed: false,
                                },
                                {
                                    name: "amount1",
                                    type: "uint256",
                                    indexed: false,
                                },
                            ],
                        },
                        args: { tokenId: nftId },
                        fromBlock,
                        toBlock: currentBlock,
                    }),

                    // Collect events
                    client.getLogs({
                        address: nftManagerAddress as `0x${string}`,
                        event: {
                            type: "event",
                            name: "Collect",
                            inputs: [
                                {
                                    name: "tokenId",
                                    type: "uint256",
                                    indexed: true,
                                },
                                {
                                    name: "recipient",
                                    type: "address",
                                    indexed: false,
                                },
                                {
                                    name: "amount0Collect",
                                    type: "uint256",
                                    indexed: false,
                                },
                                {
                                    name: "amount1Collect",
                                    type: "uint256",
                                    indexed: false,
                                },
                            ],
                        },
                        args: { tokenId: nftId },
                        fromBlock,
                        toBlock: currentBlock,
                    }),
                ]);

            // Combine all events and sort by block number
            const allEvents = [
                ...increaseEvents,
                ...decreaseEvents,
                ...collectEvents,
            ].sort((a, b) => Number(a.blockNumber - b.blockNumber));

            if (allEvents.length === 0) {
                return null; // No position events found
            }

            // Return the block number of the latest position event
            return allEvents[allEvents.length - 1].blockNumber;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            // If we can't find events, return null
            return null;
        }
    }

    /**
     * Get position data from NFT Manager contract (with historical block support)
     */
    private async getPositionFromNft(
        client: PublicClient,
        nftManagerAddress: string,
        nftId: bigint
    ) {
        try {
            // Try to get position data at current block first
            let positionData;
            let owner;

            try {
                // Get position data from positions() function
                positionData = await client.readContract({
                    address: nftManagerAddress as `0x${string}`,
                    abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
                    functionName: "positions",
                    args: [nftId],
                });

                // Get owner from ownerOf() function
                owner = await client.readContract({
                    address: nftManagerAddress as `0x${string}`,
                    abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
                    functionName: "ownerOf",
                    args: [nftId],
                });
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (currentError) {
                // If current block fails, try to find the last block when position was active
                const historicalBlock = await this.getLastEventBlockNumber(
                    client,
                    nftManagerAddress,
                    nftId
                );

                if (historicalBlock) {
                    // Retry with historical block number
                    positionData = await client.readContract({
                        address: nftManagerAddress as `0x${string}`,
                        abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
                        functionName: "positions",
                        args: [nftId],
                        blockNumber: historicalBlock,
                    });

                    owner = await client.readContract({
                        address: nftManagerAddress as `0x${string}`,
                        abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
                        functionName: "ownerOf",
                        args: [nftId],
                        blockNumber: historicalBlock,
                    });
                } else {
                    throw new Error(
                        `Position NFT ${nftId} not found and no historical events available`
                    );
                }
            }

            return {
                nonce: positionData[0],
                operator: positionData[1],
                token0: positionData[2],
                token1: positionData[3],
                fee: positionData[4],
                tickLower: positionData[5],
                tickUpper: positionData[6],
                liquidity: positionData[7],
                feeGrowthInside0LastX128: positionData[8],
                feeGrowthInside1LastX128: positionData[9],
                tokensOwed0: positionData[10],
                tokensOwed1: positionData[11],
                owner: owner as string,
            };
        } catch (error) {
            throw new Error(
                `Failed to read position data from NFT ${nftId}: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Save position to database
     */
    private async savePositionToDatabase(
        userId: string,
        positionData: ImportedPositionData
    ) {
        try {
            // For now, create a simplified position record
            // This will need to be expanded to handle pool creation, token references, etc.

            const position = await this.prisma.position.create({
                data: {
                    userId: userId,
                    tickLower: positionData.tickLower,
                    tickUpper: positionData.tickUpper,
                    liquidity: positionData.liquidity,
                    token0IsQuote: false, // TODO: Determine based on token analysis
                    owner: positionData.owner,
                    importType: "nft",
                    nftId: positionData.nftId,
                    status: "active",
                    // TODO: Create pool and token references
                    poolId: "placeholder", // This needs proper pool creation/lookup
                },
            });

            return position;
        } catch (error) {
            throw new Error(
                `Failed to save position to database: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }
}
