import { getSubgraphService } from '../subgraph';

export interface PriceDataPoint {
    timestamp: Date;
    price: string;      // BigInt: token0/token1 price
    tick: number;
    source: 'hourly' | 'daily' | 'interpolated' | 'current';
    confidence: 'exact' | 'estimated';
}

export interface PoolHistoricalData {
    id: string;
    date: number;        // Unix timestamp
    token0Price: string;
    token1Price: string;
    tick: string;
    sqrtPrice: string;
}

interface PriceCache {
    [key: string]: PriceDataPoint; // key: `${poolId}-${timestamp}`
}

export class HistoricalPriceService {
    private readonly subgraphService = getSubgraphService();
    private readonly priceCache: PriceCache = {};
    private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

    /**
     * Get price at specific timestamp with fallback strategies
     */
    async getPrice(poolAddress: string, timestamp: Date, chain: string): Promise<PriceDataPoint> {
        const cacheKey = `${poolAddress}-${timestamp.getTime()}`;
        
        // Check cache first
        if (this.priceCache[cacheKey]) {
            const cached = this.priceCache[cacheKey];
            // Simple TTL check - in production would be more sophisticated
            const age = Date.now() - timestamp.getTime();
            if (age < this.CACHE_TTL) {
                return cached;
            }
        }

        try {
            const priceData = await this.fetchHistoricalPrice(poolAddress, timestamp, chain);
            this.priceCache[cacheKey] = priceData;
            return priceData;
        } catch (error) {
            console.warn(`Failed to get historical price for ${poolAddress} at ${timestamp}:`, error.message);
            
            // Fallback to current price with estimated confidence
            try {
                const currentPrice = await this.getCurrentPoolPrice(poolAddress, chain);
                const fallbackPrice: PriceDataPoint = {
                    timestamp,
                    price: currentPrice.price,
                    tick: currentPrice.tick,
                    source: 'current',
                    confidence: 'estimated'
                };
                this.priceCache[cacheKey] = fallbackPrice;
                return fallbackPrice;
            } catch (fallbackError) {
                // Final fallback with zero values
                const zeroPriceData: PriceDataPoint = {
                    timestamp,
                    price: "0",
                    tick: 0,
                    source: 'current',
                    confidence: 'estimated'
                };
                this.priceCache[cacheKey] = zeroPriceData;
                return zeroPriceData;
            }
        }
    }

    /**
     * Get price range for multiple timestamps
     */
    async getPriceRange(poolId: string, from: Date, to: Date, chain: string): Promise<PriceDataPoint[]> {
        const now = new Date();
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Determine data granularity based on age
        if (from > hourAgo) {
            // Recent data - try hourly
            return this.fetchHourlyPrices(poolId, from, to, chain);
        } else if (from > dayAgo) {
            // Last day - try hourly then daily
            try {
                return await this.fetchHourlyPrices(poolId, from, to, chain);
            } catch (error) {
                console.warn('Hourly data failed, falling back to daily:', error.message);
                return this.fetchDailyPrices(poolId, from, to, chain);
            }
        } else {
            // Older data - use daily
            return this.fetchDailyPrices(poolId, from, to, chain);
        }
    }

    /**
     * Fetch historical price using best available data source
     */
    private async fetchHistoricalPrice(poolAddress: string, timestamp: Date, chain: string): Promise<PriceDataPoint> {
        const now = new Date();
        const ageInHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);

        if (ageInHours < 24) {
            // Try hourly data first for recent timestamps
            try {
                return await this.fetchHourlyPrice(poolAddress, timestamp, chain);
            } catch (error) {
                console.warn('Hourly data unavailable, trying daily:', error.message);
                return await this.fetchDailyPrice(poolAddress, timestamp, chain);
            }
        } else {
            // Use daily data for older timestamps
            return await this.fetchDailyPrice(poolAddress, timestamp, chain);
        }
    }

    /**
     * Fetch price from hourly data
     */
    private async fetchHourlyPrice(poolAddress: string, timestamp: Date, chain: string): Promise<PriceDataPoint> {
        const hourTimestamp = Math.floor(timestamp.getTime() / 1000 / 3600) * 3600; // Round to hour
        
        const query = `
            query GetPoolHourData($poolId: String!, $timestamp: Int!) {
                poolHourDatas(
                    where: { 
                        pool: $poolId,
                        periodStartUnix_lte: $timestamp 
                    },
                    orderBy: periodStartUnix,
                    orderDirection: desc,
                    first: 2
                ) {
                    id
                    periodStartUnix
                    token0Price
                    token1Price
                    tick
                    sqrtPrice
                }
            }
        `;

        const response = await this.subgraphService.query(chain, query, {
            poolId: poolAddress,
            timestamp: hourTimestamp
        });

        if (!response.data?.poolHourDatas?.length) {
            throw new Error('No hourly price data found');
        }

        const hourData = response.data.poolHourDatas[0];
        
        // If we have an exact match, use it
        if (hourData.periodStartUnix === hourTimestamp) {
            return {
                timestamp: new Date(hourData.periodStartUnix * 1000),
                price: this.calculatePrice(hourData.token0Price, hourData.token1Price),
                tick: parseInt(hourData.tick),
                source: 'hourly',
                confidence: 'exact'
            };
        }

        // If we have before/after data, interpolate
        if (response.data.poolHourDatas.length >= 2) {
            const before = response.data.poolHourDatas[1];
            const after = response.data.poolHourDatas[0];
            return this.interpolatePrice(before, after, timestamp);
        }

        // Use the closest available data
        return {
            timestamp: new Date(hourData.periodStartUnix * 1000),
            price: this.calculatePrice(hourData.token0Price, hourData.token1Price),
            tick: parseInt(hourData.tick),
            source: 'hourly',
            confidence: 'estimated'
        };
    }

    /**
     * Fetch price from daily data
     */
    private async fetchDailyPrice(poolAddress: string, timestamp: Date, chain: string): Promise<PriceDataPoint> {
        const dayTimestamp = Math.floor(timestamp.getTime() / 1000 / 86400) * 86400; // Round to day
        
        const query = `
            query GetPoolDayData($poolId: String!, $timestamp: Int!) {
                poolDayDatas(
                    where: { 
                        pool: $poolId,
                        date_lte: $timestamp 
                    },
                    orderBy: date,
                    orderDirection: desc,
                    first: 2
                ) {
                    id
                    date
                    token0Price
                    token1Price
                    tick
                    sqrtPrice
                }
            }
        `;

        const response = await this.subgraphService.query(chain, query, {
            poolId: poolAddress,
            timestamp: dayTimestamp
        });

        if (!response.data?.poolDayDatas?.length) {
            throw new Error('No daily price data found');
        }

        const dayData = response.data.poolDayDatas[0];
        
        // If we have an exact match, use it
        if (dayData.date === dayTimestamp) {
            return {
                timestamp: new Date(dayData.date * 1000),
                price: this.calculatePrice(dayData.token0Price, dayData.token1Price),
                tick: parseInt(dayData.tick),
                source: 'daily',
                confidence: 'exact'
            };
        }

        // If we have before/after data, interpolate
        if (response.data.poolDayDatas.length >= 2) {
            const before = response.data.poolDayDatas[1];
            const after = response.data.poolDayDatas[0];
            return this.interpolatePrice(before, after, timestamp);
        }

        // Use the closest available data
        return {
            timestamp: new Date(dayData.date * 1000),
            price: this.calculatePrice(dayData.token0Price, dayData.token1Price),
            tick: parseInt(dayData.tick),
            source: 'daily',
            confidence: 'estimated'
        };
    }

    /**
     * Fetch multiple hourly prices
     */
    private async fetchHourlyPrices(poolId: string, from: Date, to: Date, chain: string): Promise<PriceDataPoint[]> {
        const fromTimestamp = Math.floor(from.getTime() / 1000 / 3600) * 3600;
        const toTimestamp = Math.floor(to.getTime() / 1000 / 3600) * 3600;
        
        const query = `
            query GetPoolHourDataRange($poolId: String!, $from: Int!, $to: Int!) {
                poolHourDatas(
                    where: { 
                        pool: $poolId,
                        periodStartUnix_gte: $from,
                        periodStartUnix_lte: $to
                    },
                    orderBy: periodStartUnix,
                    orderDirection: asc,
                    first: 1000
                ) {
                    id
                    periodStartUnix
                    token0Price
                    token1Price
                    tick
                    sqrtPrice
                }
            }
        `;

        const response = await this.subgraphService.query(chain, query, {
            poolId,
            from: fromTimestamp,
            to: toTimestamp
        });

        if (!response.data?.poolHourDatas?.length) {
            throw new Error('No hourly price data found for range');
        }

        return response.data.poolHourDatas.map((hourData: any) => ({
            timestamp: new Date(hourData.periodStartUnix * 1000),
            price: this.calculatePrice(hourData.token0Price, hourData.token1Price),
            tick: parseInt(hourData.tick),
            source: 'hourly' as const,
            confidence: 'exact' as const
        }));
    }

    /**
     * Fetch multiple daily prices
     */
    private async fetchDailyPrices(poolId: string, from: Date, to: Date, chain: string): Promise<PriceDataPoint[]> {
        const fromTimestamp = Math.floor(from.getTime() / 1000 / 86400) * 86400;
        const toTimestamp = Math.floor(to.getTime() / 1000 / 86400) * 86400;
        
        const query = `
            query GetPoolDayDataRange($poolId: String!, $from: Int!, $to: Int!) {
                poolDayDatas(
                    where: { 
                        pool: $poolId,
                        date_gte: $from,
                        date_lte: $to
                    },
                    orderBy: date,
                    orderDirection: asc,
                    first: 1000
                ) {
                    id
                    date
                    token0Price
                    token1Price
                    tick
                    sqrtPrice
                }
            }
        `;

        const response = await this.subgraphService.query(chain, query, {
            poolId,
            from: fromTimestamp,
            to: toTimestamp
        });

        if (!response.data?.poolDayDatas?.length) {
            throw new Error('No daily price data found for range');
        }

        return response.data.poolDayDatas.map((dayData: any) => ({
            timestamp: new Date(dayData.date * 1000),
            price: this.calculatePrice(dayData.token0Price, dayData.token1Price),
            tick: parseInt(dayData.tick),
            source: 'daily' as const,
            confidence: 'exact' as const
        }));
    }

    /**
     * Get current pool price as fallback
     */
    private async getCurrentPoolPrice(poolAddress: string, chain: string): Promise<{ price: string; tick: number }> {
        const query = `
            query GetCurrentPoolPrice($poolId: String!) {
                pool(id: $poolId) {
                    id
                    token0Price
                    token1Price
                    tick
                    sqrtPrice
                }
            }
        `;

        const response = await this.subgraphService.query(chain, query, { poolId: poolAddress });
        
        if (!response.data?.pool) {
            throw new Error('Pool not found');
        }

        const pool = response.data.pool;
        return {
            price: this.calculatePrice(pool.token0Price, pool.token1Price),
            tick: parseInt(pool.tick)
        };
    }

    /**
     * Interpolate price between two data points
     */
    private interpolatePrice(
        before: any, 
        after: any, 
        targetTimestamp: Date
    ): PriceDataPoint {
        // Handle both date and periodStartUnix fields
        const beforeTime = (before.date || before.periodStartUnix) * 1000;
        const afterTime = (after.date || after.periodStartUnix) * 1000;
        const targetTime = targetTimestamp.getTime();

        // Linear interpolation
        const ratio = (targetTime - beforeTime) / (afterTime - beforeTime);
        
        const beforePrice = parseFloat(this.calculatePrice(before.token0Price, before.token1Price));
        const afterPrice = parseFloat(this.calculatePrice(after.token0Price, after.token1Price));
        const interpolatedPrice = beforePrice + (afterPrice - beforePrice) * ratio;

        // Interpolate tick as well
        const beforeTick = parseInt(before.tick);
        const afterTick = parseInt(after.tick);
        const interpolatedTick = Math.round(beforeTick + (afterTick - beforeTick) * ratio);

        return {
            timestamp: targetTimestamp,
            price: (interpolatedPrice * (10 ** 18)).toFixed(0), // Convert back to BigInt string
            tick: interpolatedTick,
            source: 'interpolated',
            confidence: 'estimated'
        };
    }

    /**
     * Calculate token0/token1 price from Subgraph data
     * Subgraph returns token0Price and token1Price, we need the actual ratio
     */
    private calculatePrice(token0Price: string, token1Price: string): string {
        // token0Price is already the price of token0 in terms of token1
        // We just need to ensure it's in BigInt format with proper precision
        const price = parseFloat(token0Price);
        
        if (isNaN(price) || price <= 0) {
            throw new Error('Invalid price data from subgraph');
        }

        // Convert to BigInt-compatible string with 18 decimal precision
        return (price * (10 ** 18)).toFixed(0);
    }

    /**
     * Clear price cache (useful for testing)
     */
    clearCache(): void {
        Object.keys(this.priceCache).forEach(key => {
            delete this.priceCache[key];
        });
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; keys: string[] } {
        return {
            size: Object.keys(this.priceCache).length,
            keys: Object.keys(this.priceCache)
        };
    }
}

// Singleton instance
let historicalPriceServiceInstance: HistoricalPriceService | null = null;

export function getHistoricalPriceService(): HistoricalPriceService {
    if (!historicalPriceServiceInstance) {
        historicalPriceServiceInstance = new HistoricalPriceService();
    }
    return historicalPriceServiceInstance;
}