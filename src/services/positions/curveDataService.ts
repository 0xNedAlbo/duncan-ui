// Remove dependency on PositionWithPnL - define local interface for curve calculations
import { calculatePositionValue } from "@/lib/utils/uniswap-v3/liquidity";
import { tickToPrice, priceToTick } from "@/lib/utils/uniswap-v3/price";
import type { CurvePoint, CurveData } from "@/components/charts/mini-pnl-curve";

// Enhanced position interface for curve calculations (includes PnL data)
export interface PositionWithPnL {
    id: string;
    liquidity: string;
    tickLower: number;
    tickUpper: number;
    token0IsQuote: boolean;
    initialValue: string;
    pool: {
        token0: {
            id: string;
            decimals: number;
        };
        token1: {
            id: string;
            decimals: number;
        };
        token0Address: string;
        token1Address: string;
        fee: number;
        currentPrice?: string;
    };
}

export interface PositionParams {
    liquidity: bigint;
    tickLower: number;
    tickUpper: number;
    currentTick: number;
    token0Address: string;
    token1Address: string;
    baseDecimals: number;
    quoteDecimals: number;
    baseIsToken0: boolean;
    initialValue: bigint;
    currentPrice: bigint;
    tickSpacing: number;
}

export class CurveDataService {
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
     * Extract position parameters for curve calculation
     */
    extractPositionParams(position: PositionWithPnL): PositionParams {
        
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
            const baseTokenAddress = baseIsToken0 ? position.pool.token0.id : position.pool.token1.id;
            const quoteTokenAddress = baseIsToken0 ? position.pool.token1.id : position.pool.token0.id;
            const lowerPrice = this.tickToPriceBigInt(position.tickLower, baseTokenAddress, quoteTokenAddress, baseDecimals);
            const upperPrice = this.tickToPriceBigInt(position.tickUpper, baseTokenAddress, quoteTokenAddress, baseDecimals);
            currentPrice = (lowerPrice + upperPrice) / 2n;
        }

        // Calculate current tick from current price using proper utilities
        let currentTick: number;
        try {
            const baseTokenAddress = baseIsToken0 ? position.pool.token0.id : position.pool.token1.id;
            const quoteTokenAddress = baseIsToken0 ? position.pool.token1.id : position.pool.token0.id;
            currentTick = priceToTick(
                currentPrice,
                tickSpacing,
                baseTokenAddress,
                quoteTokenAddress,
                baseDecimals
            );
        } catch {
            // Fallback: use middle of range
            currentTick = Math.floor((position.tickLower + position.tickUpper) / 2);
        }

        const result = {
            liquidity: BigInt(position.liquidity),
            tickLower: position.tickLower,
            tickUpper: position.tickUpper,
            currentTick,
            // Use blockchain addresses from pool, not database IDs from token
            token0Address: position.pool.token0Address,
            token1Address: position.pool.token1Address, 
            baseDecimals,
            quoteDecimals,
            baseIsToken0,
            initialValue: BigInt(position.initialValue),
            currentPrice,
            tickSpacing
        };
        
        
        return result;
    }

    /**
     * Generate optimized curve data with proper Uniswap V3 calculations
     */
    generateCurveData(position: PositionWithPnL): CurveData {
        const params = this.extractPositionParams(position);
        
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
     * Calculate PnL at a specific price using Uniswap V3 math
     */
    private calculatePnLAtPrice(price: bigint, params: PositionParams): bigint {
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
            const positionValue = calculatePositionValue(
                params.liquidity,
                tickAtPrice,
                params.tickLower,
                params.tickUpper,
                price,
                params.baseIsToken0,
                params.baseDecimals
            );
            
            // PnL = current value - initial value
            return positionValue - params.initialValue;
            
        } catch (error) {
            console.warn('PnL calculation failed for price:', price, error);
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
        } catch (error) {
            console.warn('Tick to price conversion failed:', tick, error);
            // Fallback - should not be used in production
            return 0n;
        }
    }

    /**
     * Generate curve data for multiple positions in batch (for future optimization)
     */
    generateBatchCurveData(positions: PositionWithPnL[]): Map<string, CurveData | null> {
        const results = new Map<string, CurveData | null>();
        
        for (const position of positions) {
            try {
                if (this.validatePosition(position)) {
                    results.set(position.id, this.generateCurveData(position));
                } else {
                    results.set(position.id, null);
                }
            } catch (error) {
                console.warn(`Batch curve generation failed for position ${position.id}:`, error);
                results.set(position.id, null);
            }
        }
        
        return results;
    }

    /**
     * Validate position data before curve generation
     */
    validatePosition(position: PositionWithPnL): boolean {
        try {
            // Check required fields
            if (!position.liquidity || position.liquidity === "0") return false;
            if (position.tickLower >= position.tickUpper) return false;
            if (!position.initialValue || position.initialValue === "0") return false;
            if (!position.pool) return false;
            if (!position.pool.token0 || !position.pool.token1) return false;
            
            return true;
        } catch {
            return false;
        }
    }
}

// Export singleton instance
export const curveDataService = new CurveDataService();