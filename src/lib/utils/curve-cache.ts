import type { CurveData } from "@/components/charts/mini-pnl-curve";

export interface CachedCurveData extends CurveData {
    timestamp: number;
    positionId: string;
    priceHash: string;
    version: number; // For cache schema migrations
}

export interface CacheEntry {
    data: CachedCurveData;
    expiresAt: number;
}

export interface CacheStats {
    totalEntries: number;
    totalSize: number; // in bytes
    hitRate: number;
    oldestEntry: number; // timestamp
    newestEntry: number; // timestamp
}

class CurveCache {
    private static readonly CACHE_VERSION = 1;
    private static readonly CACHE_PREFIX = "duncan_curve_cache_";
    private static readonly MAX_ENTRIES = 100;
    private static readonly DEFAULT_TTL = 60 * 60 * 1000; // 1 hour in ms
    private static readonly MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB total cache limit
    
    // In-memory stats tracking
    private stats = {
        hits: 0,
        misses: 0,
        sets: 0
    };

    /**
     * Generate cache key for position and price
     */
    private generateCacheKey(positionId: string, currentPrice: string): string {
        // Create a short hash of the price for the key
        const priceHash = this.hashString(currentPrice);
        return `${CurveCache.CACHE_PREFIX}${positionId}_${priceHash}`;
    }

    /**
     * Simple string hash function
     */
    private hashString(str: string): string {
        let hash = 0;
        if (str.length === 0) return hash.toString();
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return Math.abs(hash).toString(36).slice(0, 8);
    }

    /**
     * Get cached curve data if valid and not expired
     */
    get(positionId: string, currentPrice: string): CachedCurveData | null {
        try {
            const key = this.generateCacheKey(positionId, currentPrice);
            const cached = this.getFromStorage(key);
            
            if (!cached) {
                this.stats.misses++;
                return null;
            }

            // Check expiration
            if (Date.now() > cached.expiresAt) {
                this.removeFromStorage(key);
                this.stats.misses++;
                return null;
            }

            // Check version compatibility
            if (cached.data.version !== CurveCache.CACHE_VERSION) {
                this.removeFromStorage(key);
                this.stats.misses++;
                return null;
            }

            this.stats.hits++;
            return cached.data;

        } catch (error) {
            console.warn('Cache get error:', error);
            this.stats.misses++;
            return null;
        }
    }

    /**
     * Store curve data in cache with TTL
     */
    set(positionId: string, currentPrice: string, data: CurveData, ttl: number = CurveCache.DEFAULT_TTL): void {
        try {
            const key = this.generateCacheKey(positionId, currentPrice);
            const priceHash = this.hashString(currentPrice);
            
            const cachedData: CachedCurveData = {
                ...data,
                timestamp: Date.now(),
                positionId,
                priceHash,
                version: CurveCache.CACHE_VERSION
            };

            const cacheEntry: CacheEntry = {
                data: cachedData,
                expiresAt: Date.now() + ttl
            };

            // Check cache size limits before storing
            this.ensureCacheCapacity();

            this.setToStorage(key, cacheEntry);
            this.stats.sets++;

        } catch (error) {
            console.warn('Cache set error:', error);
            // Non-fatal - app continues without caching
        }
    }

    /**
     * Invalidate cache entries for a specific position
     */
    invalidate(positionId: string): void {
        try {
            const keys = this.getAllCacheKeys();
            const keysToRemove = keys.filter(key => 
                key.startsWith(`${CurveCache.CACHE_PREFIX}${positionId}_`)
            );

            keysToRemove.forEach(key => this.removeFromStorage(key));
            
        } catch (error) {
            console.warn('Cache invalidate error:', error);
        }
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        try {
            const keys = this.getAllCacheKeys();
            keys.forEach(key => this.removeFromStorage(key));
            
            // Reset stats
            this.stats = { hits: 0, misses: 0, sets: 0 };
            
        } catch (error) {
            console.warn('Cache clear error:', error);
        }
    }

    /**
     * Clean up expired entries and enforce size limits
     */
    cleanup(): void {
        try {
            const now = Date.now();
            const keys = this.getAllCacheKeys();
            let removedCount = 0;

            // Remove expired entries
            keys.forEach(key => {
                const cached = this.getFromStorage(key);
                if (!cached || now > cached.expiresAt) {
                    this.removeFromStorage(key);
                    removedCount++;
                }
            });

            // Enforce entry count limit
            this.enforceCacheEntryLimit();
            
            if (removedCount > 0) {
                console.debug(`Cache cleanup: removed ${removedCount} expired entries`);
            }

        } catch (error) {
            console.warn('Cache cleanup error:', error);
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        try {
            const keys = this.getAllCacheKeys();
            const entries = keys.map(key => this.getFromStorage(key)).filter(Boolean) as CacheEntry[];
            
            const totalSize = this.calculateCacheSize();
            const timestamps = entries.map(e => e.data.timestamp).filter(Boolean);
            
            const totalRequests = this.stats.hits + this.stats.misses;
            const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

            return {
                totalEntries: entries.length,
                totalSize,
                hitRate,
                oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
                newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0
            };

        } catch (error) {
            console.warn('Cache stats error:', error);
            return {
                totalEntries: 0,
                totalSize: 0,
                hitRate: 0,
                oldestEntry: 0,
                newestEntry: 0
            };
        }
    }

    /**
     * Check if caching is available
     */
    isAvailable(): boolean {
        try {
            if (typeof window === 'undefined') return false;
            if (!window.localStorage) return false;
            
            // Test storage availability
            const testKey = '__cache_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
            
        } catch {
            return false;
        }
    }

    // Private helper methods

    private getFromStorage(key: string): CacheEntry | null {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch {
            return null;
        }
    }

    private setToStorage(key: string, entry: CacheEntry): void {
        try {
            localStorage.setItem(key, JSON.stringify(entry));
        } catch (error) {
            // Handle storage quota exceeded
            console.warn('Storage quota exceeded, cleaning up cache');
            this.cleanup();
            // Try once more after cleanup
            try {
                localStorage.setItem(key, JSON.stringify(entry));
            } catch {
                // If still failing, give up silently
            }
        }
    }

    private removeFromStorage(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch {
            // Silent failure
        }
    }

    private getAllCacheKeys(): string[] {
        try {
            const keys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(CurveCache.CACHE_PREFIX)) {
                    keys.push(key);
                }
            }
            return keys;
        } catch {
            return [];
        }
    }

    private calculateCacheSize(): number {
        try {
            const keys = this.getAllCacheKeys();
            let totalSize = 0;
            
            keys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value) {
                    // Approximate size: key + value length in UTF-16
                    totalSize += (key.length + value.length) * 2;
                }
            });
            
            return totalSize;
        } catch {
            return 0;
        }
    }

    private ensureCacheCapacity(): void {
        // Check total size
        const currentSize = this.calculateCacheSize();
        if (currentSize > CurveCache.MAX_SIZE_BYTES) {
            this.cleanup();
            
            // If still over limit, remove oldest entries
            const remainingSize = this.calculateCacheSize();
            if (remainingSize > CurveCache.MAX_SIZE_BYTES) {
                this.removeOldestEntries(10); // Remove 10 oldest
            }
        }

        // Check entry count
        this.enforceCacheEntryLimit();
    }

    private enforceCacheEntryLimit(): void {
        const keys = this.getAllCacheKeys();
        if (keys.length <= CurveCache.MAX_ENTRIES) return;

        // Get entries with timestamps
        const entries = keys.map(key => ({
            key,
            entry: this.getFromStorage(key)
        })).filter(item => item.entry !== null) as Array<{key: string, entry: CacheEntry}>;

        // Sort by timestamp (oldest first)
        entries.sort((a, b) => a.entry.data.timestamp - b.entry.data.timestamp);

        // Remove oldest entries to stay within limit
        const toRemove = entries.length - CurveCache.MAX_ENTRIES;
        for (let i = 0; i < toRemove; i++) {
            this.removeFromStorage(entries[i].key);
        }
    }

    private removeOldestEntries(count: number): void {
        const keys = this.getAllCacheKeys();
        const entries = keys.map(key => ({
            key,
            entry: this.getFromStorage(key)
        })).filter(item => item.entry !== null) as Array<{key: string, entry: CacheEntry}>;

        // Sort by timestamp (oldest first)
        entries.sort((a, b) => a.entry.data.timestamp - b.entry.data.timestamp);

        // Remove oldest entries
        const toRemove = Math.min(count, entries.length);
        for (let i = 0; i < toRemove; i++) {
            this.removeFromStorage(entries[i].key);
        }
    }
}

// Export singleton instance
export const curveCache = new CurveCache();

// Auto-cleanup on app start (if in browser)
if (typeof window !== 'undefined') {
    // Cleanup expired entries on startup
    setTimeout(() => {
        curveCache.cleanup();
    }, 1000);

    // Periodic cleanup every 10 minutes
    setInterval(() => {
        curveCache.cleanup();
    }, 10 * 60 * 1000);
}