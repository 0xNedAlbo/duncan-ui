/**
 * Curve Data Service - Updated to Current Design Patterns
 *
 * Generates PnL curve data for Uniswap V3 positions using proper cost basis
 * from PositionPnLService and dependency injection patterns.
 */

import { PrismaClient } from "@prisma/client";
import { getTokenAmountsFromLiquidity } from "@/lib/utils/uniswap-v3/liquidity";
import { tickToPrice, priceToTick } from "@/lib/utils/uniswap-v3/price";
import type { CurvePoint, CurveData } from "@/components/charts/mini-pnl-curve";
import type { Services } from "../ServiceFactory";
import type { Clients } from "../ClientsFactory";
import type { BasicPosition, PositionId } from "./positionService";
import { PositionPnLService } from "./positionPnLService";

interface CurvePositionParams {
    liquidity: bigint;
    tickLower: number;
    tickUpper: number;
    currentTick: number;
    token0Address: string;
    token1Address: string;
    baseDecimals: number;
    quoteDecimals: number;
    baseIsToken0: boolean;
    currentCostBasis: bigint;
    currentPrice: bigint;
    tickSpacing: number;
}

export class CurveDataService {
    private prisma: PrismaClient;
    private positionPnLService: PositionPnLService;

    /**
     * Service for generating and caching PnL curve visualization data.
     *
     * Design Pattern: Updated to include database caching capabilities:
     * - Provides cache-first pattern for expensive curve calculations
     * - Uses database storage for persistence across sessions
     * - Maintains dependency on PositionPnLService for cost basis calculations
     * - Includes cache invalidation logic linked to pool state changes
     *
     * Cache Strategy: Complete curve data stored as JSON for atomic operations.
     */
    constructor(
        requiredClients: Pick<Clients, 'prisma'>,
        requiredServices: Pick<Services, 'positionPnLService'>
    ) {
        this.prisma = requiredClients.prisma;
        this.positionPnLService = requiredServices.positionPnLService;
    }

    /**
     * Get tick spacing from fee tier
     */
    private getTickSpacing(fee: number): number {
        switch (fee) {
            case 100: return 1;
            case 500: return 10;
            case 3000: return 60;
            case 10000: return 200;
            default: return 60; // Default to 0.3% fee tier
        }
    }

    /**
     * Calculate position value at a specific price
     * @param liquidity Position liquidity
     * @param currentTick Current price tick
     * @param tickLower Lower bound tick
     * @param tickUpper Upper bound tick
     * @param currentPrice Current price in quote token units
     * @param baseIsToken0 Whether base token is token0
     * @param baseDecimals Base token decimals
     * @returns Position value in quote token units
     */
    private calculatePositionValue(
        liquidity: bigint,
        currentTick: number,
        tickLower: number,
        tickUpper: number,
        currentPrice: bigint,
        baseIsToken0: boolean,
        baseDecimals: number
    ): bigint {
        // Get token amounts at current price
        const { token0Amount, token1Amount } = getTokenAmountsFromLiquidity(
            liquidity,
            currentTick,
            tickLower,
            tickUpper
        );

        if (baseIsToken0) {
            // Base = token0, Quote = token1
            // Value = token0Amount * currentPrice + token1Amount
            // currentPrice is already in quote token decimals per base token
            const baseValueInQuote = (token0Amount * currentPrice) / BigInt(10 ** baseDecimals);
            return baseValueInQuote + token1Amount;
        } else {
            // Base = token1, Quote = token0
            // Value = token1Amount * currentPrice + token0Amount
            // currentPrice is already in quote token decimals per base token
            const baseValueInQuote = (token1Amount * currentPrice) / BigInt(10 ** baseDecimals);
            return baseValueInQuote + token0Amount;
        }
    }
    /**
     * Extract position parameters for curve calculation with current cost basis
     */
    private async extractPositionParams(position: BasicPosition): Promise<CurvePositionParams> {
        
        const baseIsToken0 = !position.token0IsQuote;
        const baseDecimals = baseIsToken0 ? position.pool.token0.decimals : position.pool.token1.decimals;
        const quoteDecimals = position.token0IsQuote ? position.pool.token0.decimals : position.pool.token1.decimals;
        const tickSpacing = this.getTickSpacing(position.pool.fee);
        
        
        // Parse current price from string to bigint
        // Note: position.pool.currentPrice is already in the correct base/quote format from positionService
        let currentPrice: bigint;
        try {
            if (position.pool.currentPrice && position.pool.currentPrice !== "0") {
                // Use the pre-calculated price from positionService (already in base/quote format with correct decimals)
                currentPrice = BigInt(position.pool.currentPrice);
            } else {
                throw new Error("No current price available");
            }
        } catch {
            // Fallback: calculate middle price from ticks using proper utilities
            const baseTokenAddress = baseIsToken0 ? position.pool.token0.address : position.pool.token1.address;
            const quoteTokenAddress = baseIsToken0 ? position.pool.token1.address : position.pool.token0.address;
            const lowerPrice = this.tickToPriceBigInt(position.tickLower, baseTokenAddress, quoteTokenAddress, baseDecimals);
            const upperPrice = this.tickToPriceBigInt(position.tickUpper, baseTokenAddress, quoteTokenAddress, baseDecimals);
            currentPrice = (lowerPrice + upperPrice) / 2n;
        }

        // Calculate current tick from current price using proper utilities
        let currentTick: number;
        try {
            const baseTokenAddress = baseIsToken0 ? position.pool.token0.address : position.pool.token1.address;
            const quoteTokenAddress = baseIsToken0 ? position.pool.token1.address : position.pool.token0.address;
            currentTick = priceToTick(
                currentPrice,
                tickSpacing,
                baseTokenAddress,
                quoteTokenAddress,
                baseDecimals
            );
        } catch {
            // Fallback: use current tick from pool if available, otherwise middle of range
            currentTick = position.pool.currentTick ?? Math.floor((position.tickLower + position.tickUpper) / 2);
        }

        // Get current cost basis from PnL service
        const positionId: PositionId = {
            userId: position.userId,
            chain: position.chain,
            protocol: position.protocol,
            nftId: position.nftId
        };
        const pnlBreakdown = await this.positionPnLService.getPnlBreakdown(positionId);
        const currentCostBasis = BigInt(pnlBreakdown.currentCostBasis);

        const result = {
            liquidity: BigInt(position.liquidity),
            tickLower: position.tickLower,
            tickUpper: position.tickUpper,
            currentTick,
            // Use blockchain addresses from pool, not database IDs from token
            token0Address: position.pool.token0.address,
            token1Address: position.pool.token1.address,
            baseDecimals,
            quoteDecimals,
            baseIsToken0,
            currentCostBasis,
            currentPrice,
            tickSpacing
        };
        
        
        return result;
    }

    /**
     * Get cached curve data or generate fresh data with caching
     * Cache-first pattern similar to PositionPnLService
     */
    async getCurveData(position: BasicPosition): Promise<CurveData> {
        // Check for valid cached curve data
        const cachedCurve = await this.prisma.positionCurve.findFirst({
            where: {
                positionUserId: position.userId,
                positionChain: position.chain,
                positionProtocol: position.protocol,
                positionNftId: position.nftId,
                isValid: true
            }
        });

        if (cachedCurve) {
            // Return cached data
            return cachedCurve.curveData as unknown as CurveData;
        }

        // No valid cache found - generate fresh curve data and cache it
        const positionId: PositionId = {
            userId: position.userId,
            chain: position.chain,
            protocol: position.protocol,
            nftId: position.nftId
        };
        const freshCurveData = await this.generateCurveData(position);
        await this.cacheCurveData(positionId, freshCurveData, position);

        return freshCurveData;
    }

    /**
     * Generate optimized curve data with proper Uniswap V3 calculations
     * Private method - use getCurveData() for cache-first access
     */
    private async generateCurveData(position: BasicPosition): Promise<CurveData> {
        const params = await this.extractPositionParams(position);
        
        // Calculate price range for curve using proper token addresses  
        const baseTokenAddress = params.baseIsToken0 ? params.token0Address : params.token1Address;
        const quoteTokenAddress = params.baseIsToken0 ? params.token1Address : params.token0Address;
        
        const lowerPrice = this.tickToPriceBigInt(params.tickLower, baseTokenAddress, quoteTokenAddress, params.baseDecimals);
        const upperPrice = this.tickToPriceBigInt(params.tickUpper, baseTokenAddress, quoteTokenAddress, params.baseDecimals);
        
        // Add 20% buffer around range using BigInt math
        const rangeWidth = upperPrice - lowerPrice;
        const buffer = rangeWidth / 5n; // 20%
        const minPrice = lowerPrice > buffer ? lowerPrice - buffer : lowerPrice / 2n; // Prevent negative prices
        const maxPrice = upperPrice + buffer;
        
        // Generate optimized curve points (25 points)
        const numPoints = 25;
        const points: CurvePoint[] = [];
        let currentPriceIndex = 0;
        let lowerIndex = 0;
        let upperIndex = 0;
        
        for (let i = 0; i <= numPoints; i++) {
            // Calculate price for this point
            const progress = i / numPoints;
            const priceAtPoint = minPrice + BigInt(Math.floor(Number(maxPrice - minPrice) * progress));
            
            // Calculate PnL at this price
            const pnl = this.calculatePnLAtPrice(priceAtPoint, params);
            
            // Determine phase
            let phase: 'below' | 'in-range' | 'above';
            if (priceAtPoint < lowerPrice) {
                phase = 'below';
            } else if (priceAtPoint > upperPrice) {
                phase = 'above';
            } else {
                phase = 'in-range';
            }
            
            // Convert to display numbers
            const priceNumber = Number(priceAtPoint) / Math.pow(10, params.quoteDecimals);
            const pnlNumber = Number(pnl) / Math.pow(10, params.quoteDecimals);
            
            points.push({
                price: priceNumber,
                pnl: pnlNumber,
                phase
            });
            
            // Track important indices
            const currentPriceNumber = Number(params.currentPrice) / Math.pow(10, params.quoteDecimals); // currentPrice from positionService is scaled by quoteDecimals (token1 per token0)
            const lowerPriceNumber = Number(lowerPrice) / Math.pow(10, params.quoteDecimals);
            const upperPriceNumber = Number(upperPrice) / Math.pow(10, params.quoteDecimals);
            
            if (Math.abs(priceNumber - currentPriceNumber) < Math.abs((points[currentPriceIndex]?.price || Infinity) - currentPriceNumber)) {
                currentPriceIndex = i;
            }
            if (Math.abs(priceNumber - lowerPriceNumber) < Math.abs((points[lowerIndex]?.price || Infinity) - lowerPriceNumber)) {
                lowerIndex = i;
            }
            if (Math.abs(priceNumber - upperPriceNumber) < Math.abs((points[upperIndex]?.price || Infinity) - upperPriceNumber)) {
                upperIndex = i;
            }
        }
        
        // Calculate ranges
        const allPrices = points.map(p => p.price);
        const allPnls = points.map(p => p.pnl);
        
        return {
            points,
            priceRange: {
                min: Math.min(...allPrices),
                max: Math.max(...allPrices)
            },
            pnlRange: {
                min: Math.min(...allPnls),
                max: Math.max(...allPnls)
            },
            currentPriceIndex,
            rangeIndices: {
                lower: lowerIndex,
                upper: upperIndex
            },
            lowerPrice: Number(lowerPrice) / Math.pow(10, params.quoteDecimals),
            upperPrice: Number(upperPrice) / Math.pow(10, params.quoteDecimals),
            currentPrice: Number(params.currentPrice) / Math.pow(10, params.quoteDecimals) // currentPrice from positionService is scaled by quoteDecimals (token1 per token0)
        };
    }

    /**
     * Cache curve data to database
     */
    private async cacheCurveData(positionId: PositionId, curveData: CurveData, position: BasicPosition): Promise<void> {
        // Get current pool state for cache metadata
        const poolData = await this.prisma.pool.findUnique({
            where: {
                chain_poolAddress: {
                    chain: position.pool.chain,
                    poolAddress: position.pool.poolAddress,
                },
            },
            select: { currentTick: true, sqrtPriceX96: true }
        });

        // Get PnL cache version for dependency tracking
        const pnlCache = await this.prisma.positionPnL.findFirst({
            where: {
                positionUserId: positionId.userId,
                positionChain: positionId.chain,
                positionProtocol: positionId.protocol,
                positionNftId: positionId.nftId,
            },
            select: { id: true, updatedAt: true }
        });

        // Upsert the cache entry
        await this.prisma.positionCurve.upsert({
            where: {
                positionUserId_positionChain_positionProtocol_positionNftId: {
                    positionUserId: positionId.userId,
                    positionChain: positionId.chain,
                    positionProtocol: positionId.protocol,
                    positionNftId: positionId.nftId,
                },
            },
            update: {
                curveData: curveData as any, // Prisma Json type
                poolTick: poolData?.currentTick,
                poolSqrtPriceX96: poolData?.sqrtPriceX96,
                pnlCacheVersion: pnlCache?.id,
                isValid: true,
                updatedAt: new Date()
            },
            create: {
                positionUserId: positionId.userId,
                positionChain: positionId.chain,
                positionProtocol: positionId.protocol,
                positionNftId: positionId.nftId,
                curveData: curveData as any, // Prisma Json type
                poolTick: poolData?.currentTick,
                poolSqrtPriceX96: poolData?.sqrtPriceX96,
                pnlCacheVersion: pnlCache?.id,
                isValid: true
            }
        });
    }

    /**
     * Calculate PnL at a specific price using Uniswap V3 math
     * PnL = current value - current cost basis (not initial value)
     */
    private calculatePnLAtPrice(price: bigint, params: CurvePositionParams): bigint {
        try {
            // Convert price to tick using proper utilities
            const tickAtPrice = priceToTick(
                price,
                params.tickSpacing,
                params.baseIsToken0 ? params.token0Address : params.token1Address, // baseTokenAddress
                params.baseIsToken0 ? params.token1Address : params.token0Address, // quoteTokenAddress
                params.baseDecimals
            );

            // Calculate position value at this price/tick
            const positionValue = this.calculatePositionValue(
                params.liquidity,
                tickAtPrice,
                params.tickLower,
                params.tickUpper,
                price,
                params.baseIsToken0,
                params.baseDecimals
            );

            // PnL = current value - current cost basis (proper baseline)
            return positionValue - params.currentCostBasis;

        } catch {
            return 0n; // Fallback to zero PnL
        }
    }

    /**
     * Convert tick to price using proper utilities
     * Returns price in quote token decimals
     */
    private tickToPriceBigInt(tick: number, baseTokenAddress: string, quoteTokenAddress: string, baseDecimals: number): bigint {
        try {
            return tickToPrice(tick, baseTokenAddress, quoteTokenAddress, baseDecimals);
        } catch {
            // Fallback - should not be used in production
            return 0n;
        }
    }

    /**
     * Generate curve data for multiple positions in batch (for future optimization)
     */
    async generateBatchCurveData(positions: BasicPosition[]): Promise<Map<string, CurveData | null>> {
        const results = new Map<string, CurveData | null>();

        for (const position of positions) {
            try {
                const positionKey = `${position.chain}-${position.protocol}-${position.nftId}`;
                if (this.validatePosition(position)) {
                    const curveData = await this.generateCurveData(position);
                    results.set(positionKey, curveData);
                } else {
                    results.set(positionKey, null);
                }
            } catch {
                const positionKey = `${position.chain}-${position.protocol}-${position.nftId}`;
                results.set(positionKey, null);
            }
        }

        return results;
    }

    /**
     * Validate position data before curve generation
     */
    validatePosition(position: BasicPosition): boolean {
        try {
            // Check required fields
            if (!position.liquidity || position.liquidity === "0") return false;
            if (position.tickLower >= position.tickUpper) return false;
            if (!position.pool) return false;
            if (!position.pool.token0 || !position.pool.token1) return false;

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Invalidate cached curve data for a position
     */
    async invalidateCache(positionId: PositionId): Promise<void> {
        await this.prisma.positionCurve.updateMany({
            where: {
                positionUserId: positionId.userId,
                positionChain: positionId.chain,
                positionProtocol: positionId.protocol,
                positionNftId: positionId.nftId,
            },
            data: { isValid: false }
        });
    }

    /**
     * Invalidate curve cache for multiple positions (batch operation)
     */
    async invalidateBatchCache(positions: PositionId[]): Promise<void> {
        // For batch operations with composite keys, we need to use OR conditions
        if (positions.length === 0) return;

        await this.prisma.positionCurve.updateMany({
            where: {
                OR: positions.map(pos => ({
                    positionUserId: pos.userId,
                    positionChain: pos.chain,
                    positionProtocol: pos.protocol,
                    positionNftId: pos.nftId,
                }))
            },
            data: { isValid: false }
        });
    }

    /**
     * Invalidate all curve cache for positions in a specific pool
     * Useful when pool state changes significantly
     */
    async invalidatePoolCache(chain: string, poolAddress: string): Promise<void> {
        await this.prisma.positionCurve.updateMany({
            where: {
                position: {
                    chain: chain,
                    poolAddress: poolAddress
                }
            },
            data: { isValid: false }
        });
    }

    /**
     * Invalidate all cached curve data (useful for maintenance or system updates)
     */
    async invalidateAllCache(): Promise<void> {
        await this.prisma.positionCurve.updateMany({
            where: { isValid: true },
            data: { isValid: false }
        });
    }

    /**
     * Clean up old invalid cache entries
     * Should be called periodically to maintain database hygiene
     */
    async cleanupOldCache(olderThanDays: number = 7): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const result = await this.prisma.positionCurve.deleteMany({
            where: {
                isValid: false,
                updatedAt: {
                    lt: cutoffDate
                }
            }
        });

        return result.count;
    }
}