/**
 * Position Import Service
 *
 * Handles importing Uniswap V3 positions from blockchain data via RPC calls.
 * Imports positions by NFT ID and creates database records.
 */

import { type PublicClient } from "viem";

import { type SupportedChainsType, getChainId } from "@/config/chains";
import {
    NONFUNGIBLE_POSITION_MANAGER_ABI,
    NONFUNGIBLE_POSITION_MANAGER_ADDRESSES
} from "@/lib/contracts/nonfungiblePositionManager";
import { PrismaClient } from "@prisma/client";
import { PoolService } from "../pools/poolService";
import { PositionService } from "./positionService";
// import { PositionPnLService } from "./positionPnLService";
// import { PositionLedgerService } from "./positionLedgerService";
import { EtherscanEventService } from "../etherscan/etherscanEventService";
import { QuoteTokenService } from "./quoteTokenService";
import type { Services } from "../ServiceFactory";
import type { Clients } from "../ClientsFactory";
import { createServiceLogger, type ServiceLogger } from "@/lib/logging/loggerFactory";


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
    position?: {
        chain: string;
        protocol: string;
        nftId: string;
    };
    message: string;
    data?: ImportedPositionData;
}

export class PositionImportService {
    private prisma: PrismaClient;
    private rpcClients: Map<SupportedChainsType, PublicClient>;
    private pools: PoolService;
    private positions: PositionService;
    // private positionPnLService: PositionPnLService;
    // private positionLedgerService: PositionLedgerService;
    private etherscanEventService: EtherscanEventService;
    private quoteTokenService: QuoteTokenService;
    private logger: ServiceLogger;

    constructor(
        requiredClients: Pick<
            Clients,
            "prisma" | "rpcClients" | "etherscanClient"
        >,
        requiredServices: Pick<Services, "positionService" | "poolService">
        // requiredServices: Pick<Services, "positionService" | "poolService" | "positionPnLService" | "positionLedgerService">
    ) {
        this.prisma = requiredClients.prisma;
        this.rpcClients = requiredClients.rpcClients;
        this.positions = requiredServices.positionService;
        this.pools = requiredServices.poolService;
        // this.positionPnLService = requiredServices.positionPnLService;
        // this.positionLedgerService = requiredServices.positionLedgerService;
        this.etherscanEventService = new EtherscanEventService({
            etherscanClient: requiredClients.etherscanClient,
        });
        this.quoteTokenService = new QuoteTokenService();
        this.logger = createServiceLogger('PositionImportService');
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

            const chainId = getChainId(chain);
            const nftManagerAddress = NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId];
            if (!nftManagerAddress) {
                throw new Error(
                    `NFT Manager address not configured for chain: ${chain} (chainId: ${chainId})`
                );
            }

            // Step 1: Get position events to check if position is closed
            const events = await this.etherscanEventService.fetchPositionEvents(
                chain,
                nftId
            );

            // Step 2: Calculate position status from events
            const positionStatus = this.calculatePositionStatus(events);

            // Step 3: Get position data from NFT Manager
            // If position is closed, query at the block before the last event
            let queryBlock: bigint | undefined;
            if (positionStatus.status === "closed" && events.length > 0) {
                // Use the block before the last event to ensure position still existed
                const lastEvent = events[events.length - 1];
                queryBlock = lastEvent.blockNumber - 1n;
            }

            const positionData = await this.getPositionFromNft(
                client,
                nftManagerAddress,
                BigInt(nftId),
                queryBlock
            );

            // Step 4: Get pool address from factory contract
            const poolAddress = await this.positions.getPoolAddress(
                chain,
                positionData.token0,
                positionData.token1,
                positionData.fee
            );

            // Step 5: Create imported position data structure
            const importedData: ImportedPositionData = {
                nftId: nftId,
                poolAddress: poolAddress.toLowerCase(),
                tickLower: positionData.tickLower,
                tickUpper: positionData.tickUpper,
                // Use current liquidity (0 for closed positions) instead of historical liquidity
                liquidity: positionStatus.currentLiquidity.toString(),
                token0Address: positionData.token0.toLowerCase(),
                token1Address: positionData.token1.toLowerCase(),
                fee: positionData.fee,
                chain,
                owner: positionData.owner.toLowerCase(),
            };

            // Step 6: Create/get pool information
            const poolData = await this.pools.createPool(
                chain,
                poolAddress
            );

            // Step 7: Verify user exists
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                throw new Error(`User with ID ${userId} not found`);
            }

            // Step 8: Determine quote token configuration
            const { token0IsQuote } =
                this.quoteTokenService.determineQuoteToken(
                    poolData.token0.symbol,
                    poolData.token0.address,
                    poolData.token1.symbol,
                    poolData.token1.address,
                    chain
                );

            // Step 9: Save position to database
            const savedPosition = await this.positions.createPosition({
                chain: chain,
                protocol: "uniswapv3",
                nftId: importedData.nftId,
                userId: userId,
                poolChain: chain,
                poolAddress: poolData.poolAddress,
                tickLower: importedData.tickLower,
                tickUpper: importedData.tickUpper,
                liquidity: importedData.liquidity,
                token0IsQuote: token0IsQuote,
                owner: importedData.owner,
                importType: "nft",
                status: positionStatus.status === "closed" ? "closed" : "active",
            });

            // Step 10: Sync position events (temporarily disabled - requires PositionLedgerService updates)
            // TODO: Re-enable after PositionLedgerService is updated for composite keys
            this.logger.debug({
                chain: savedPosition.chain,
                protocol: savedPosition.protocol,
                nftId: savedPosition.nftId
            }, 'Event sync temporarily disabled during schema migration');

            // Step 11: Calculate PnL breakdown (temporarily disabled - requires PositionPnLService updates)
            // TODO: Re-enable after PositionPnLService is updated for composite keys
            this.logger.debug({
                chain: savedPosition.chain,
                protocol: savedPosition.protocol,
                nftId: savedPosition.nftId
            }, 'PnL calculation temporarily disabled during schema migration');

            return {
                success: true,
                position: {
                    chain: savedPosition.chain,
                    protocol: savedPosition.protocol,
                    nftId: savedPosition.nftId,
                },
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
     * Calculate position status based on liquidity events
     */
    private calculatePositionStatus(events: any[]): {
        status: "open" | "closed";
        currentLiquidity: bigint;
    } {
        let netLiquidity = 0n;

        for (const event of events) {
            if (event.eventType === "INCREASE_LIQUIDITY") {
                netLiquidity += BigInt(event.liquidity!);
            } else if (event.eventType === "DECREASE_LIQUIDITY") {
                netLiquidity -= BigInt(event.liquidity!);
            }
            // COLLECT events don't affect liquidity
        }

        return {
            status: netLiquidity === 0n ? "closed" : "open",
            currentLiquidity: netLiquidity,
        };
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
        nftId: bigint,
        blockNumber?: bigint
    ) {
        try {
            let positionData;
            let owner;

            // If blockNumber is provided, query at that specific block
            if (blockNumber) {
                positionData = await client.readContract({
                    address: nftManagerAddress as `0x${string}`,
                    abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
                    functionName: "positions",
                    args: [nftId],
                    blockNumber,
                });

                owner = await client.readContract({
                    address: nftManagerAddress as `0x${string}`,
                    abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
                    functionName: "ownerOf",
                    args: [nftId],
                    blockNumber,
                });
            } else {
                try {
                    // Try current block first
                    positionData = await client.readContract({
                        address: nftManagerAddress as `0x${string}`,
                        abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
                        functionName: "positions",
                        args: [nftId],
                    });

                    owner = await client.readContract({
                        address: nftManagerAddress as `0x${string}`,
                        abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
                        functionName: "ownerOf",
                        args: [nftId],
                    });
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (currentError) {
                    // Fallback: find the last block when position was active
                    const historicalBlock = await this.getLastEventBlockNumber(
                        client,
                        nftManagerAddress,
                        nftId
                    );

                    if (historicalBlock) {
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
}
