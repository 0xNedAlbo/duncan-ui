/* eslint-disable no-unused-vars */
/**
 * Position Store - Hybrid approach with LRU cache
 *
 * Manages position data with:
 * - Current list from pagination/filters
 * - Recently viewed details (LRU cache)
 * - Global updates across all store locations
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { apiClient } from "@/lib/app/apiClient";
import type { BasicPosition } from "@/services/positions/positionService";
import type { PnlBreakdown } from "@/services/positions/positionPnLService";
import type { AprBreakdown } from "@/services/positions/positionAprService";
import type { CurveData } from "@/components/charts/mini-pnl-curve";
import type {
    PositionListParams,
    PositionRefreshResponse,
    PaginationResponse,
} from "@/types/api";

// Enhanced position with all detail data
export interface PositionWithDetails {
    // Core position data
    basicData: BasicPosition;

    // PnL breakdown (optional - may not be loaded yet)
    pnlBreakdown?: PnlBreakdown;

    // APR breakdown (optional - may not be loaded yet)
    aprBreakdown?: AprBreakdown;

    // Curve data (optional - may not be loaded yet)
    curveData?: CurveData;

    // Metadata
    lastUpdated: string;
    isRefreshing?: boolean;
}

// Store state interface
export interface PositionStore {
    // Current list from pagination/filters
    currentList: {
        positions: Record<string, PositionWithDetails>; // ${chain}-${nftId} keys
        pagination: PaginationResponse;
        filters: PositionListParams;
        isLoading: boolean;
        error: string | null;
    };

    // Recently viewed details (LRU cache, max 20 positions)
    recentlyViewed: Record<string, PositionWithDetails>;
    recentlyViewedOrder: string[]; // LRU tracking array
    maxRecentlyViewed: number;

    // Currently active position for details page
    activePositionKey: string | null;

    // Global refresh state
    isRefreshing: boolean;

    // Actions
    setCurrentList: (
        _positions: BasicPosition[],
        _pagination: PaginationResponse,
        _filters: PositionListParams
    ) => void;
    addPosition: (_position: BasicPosition) => void;
    removePosition: (_chain: string, _nftId: string) => void;
    navigateToPosition: (_chain: string, _nftId: string) => void;
    refreshPosition: (_chain: string, _nftId: string) => Promise<void>;
    loadPositionDetails: (
        _chain: string,
        _nftId: string
    ) => Promise<PositionWithDetails | null>;
    updatePositionEverywhere: (
        _key: string,
        _updatedPosition: PositionWithDetails
    ) => void;
    getPosition: (_chain: string, _nftId: string) => PositionWithDetails | null;
    setListLoading: (_loading: boolean) => void;
    setListError: (_error: string | null) => void;
    clearRecentlyViewed: () => void;
}

/**
 * Generate position key from chain and NFT ID
 */
function getPositionKey(chain: string, nftId: string): string {
    return `${chain}-${nftId}`;
}

/**
 * Convert BasicPosition to PositionWithDetails
 */
function basicPositionToDetails(position: BasicPosition): PositionWithDetails {
    return {
        basicData: position,
        lastUpdated: new Date().toISOString(),
    };
}

/**
 * Add position to LRU cache
 */
function addToLRU(
    positions: Record<string, PositionWithDetails>,
    order: string[],
    key: string,
    position: PositionWithDetails,
    maxSize: number
): { positions: Record<string, PositionWithDetails>; order: string[] } {
    const newPositions = { ...positions };
    const newOrder = order.filter((k) => k !== key); // Remove if exists

    // Add to front
    newOrder.unshift(key);
    newPositions[key] = position;

    // Trim if over limit
    if (newOrder.length > maxSize) {
        const removedKeys = newOrder.splice(maxSize);
        removedKeys.forEach((removedKey) => {
            delete newPositions[removedKey];
        });
    }

    return { positions: newPositions, order: newOrder };
}

export const usePositionStore = create<PositionStore>()(
    devtools(
        persist(
            (set, get) => ({
                // Initial state
                currentList: {
                    positions: {},
                    pagination: {
                        total: 0,
                        limit: 20,
                        offset: 0,
                        hasMore: false,
                        nextOffset: null,
                    },
                    filters: {},
                    isLoading: false,
                    error: null,
                },

                recentlyViewed: {},
                recentlyViewedOrder: [],
                maxRecentlyViewed: 20,

                activePositionKey: null,
                isRefreshing: false,

                // Actions
                setCurrentList: (positions, pagination, filters) => {
                    const positionsWithDetails: Record<
                        string,
                        PositionWithDetails
                    > = {};

                    positions.forEach((position) => {
                        if (position.nftId && position.pool.chain) {
                            const key = getPositionKey(
                                position.pool.chain,
                                position.nftId
                            );
                            positionsWithDetails[key] =
                                basicPositionToDetails(position);
                        }
                    });

                    set((state) => ({
                        ...state,
                        currentList: {
                            positions: positionsWithDetails,
                            pagination,
                            filters,
                            isLoading: false,
                            error: null,
                        },
                    }));
                },

                addPosition: (position) => {
                    set((state) => {
                        // Validate required fields before adding
                        if (!position.nftId || !position.pool.chain) {
                            console.error(
                                "Cannot add position: missing required nftId or chain",
                                {
                                    nftId: position.nftId,
                                    chain: position.pool.chain,
                                }
                            );
                            return state; // Return unchanged state
                        }

                        const key = getPositionKey(
                            position.pool.chain,
                            position.nftId
                        );
                        const newPosition = basicPositionToDetails(position);

                        return {
                            ...state,
                            currentList: {
                                ...state.currentList,
                                positions: {
                                    [key]: newPosition,
                                    ...state.currentList.positions,
                                },
                                pagination: {
                                    ...state.currentList.pagination,
                                    total:
                                        state.currentList.pagination.total + 1,
                                },
                            },
                        };
                    });
                },

                removePosition: (chain, nftId) => {
                    set((state) => {
                        const key = getPositionKey(chain, nftId);

                        // Create new currentList.positions without the deleted position
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { [key]: _, ...remainingPositions } =
                            state.currentList.positions;

                        // Create new recentlyViewed without the deleted position
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { [key]: _removed, ...remainingRecentlyViewed } =
                            state.recentlyViewed;

                        // Update recently viewed order to remove the deleted position
                        const newRecentlyViewedOrder =
                            state.recentlyViewedOrder.filter((k) => k !== key);

                        // Reset active position if it was the deleted one
                        const newActivePositionKey =
                            state.activePositionKey === key
                                ? null
                                : state.activePositionKey;

                        return {
                            ...state,
                            currentList: {
                                ...state.currentList,
                                positions: remainingPositions,
                                pagination: {
                                    ...state.currentList.pagination,
                                    total: Math.max(
                                        0,
                                        state.currentList.pagination.total - 1
                                    ),
                                },
                            },
                            recentlyViewed: remainingRecentlyViewed,
                            recentlyViewedOrder: newRecentlyViewedOrder,
                            activePositionKey: newActivePositionKey,
                        };
                    });
                },

                navigateToPosition: (chain, nftId) => {
                    const key = getPositionKey(chain, nftId);
                    const state = get();

                    // Try to get position from current list first
                    let position = state.currentList.positions[key];

                    // If not in current list, check recently viewed
                    if (!position) {
                        position = state.recentlyViewed[key];
                    }

                    if (position) {
                        // Add/move to front of recently viewed LRU cache
                        const {
                            positions: newRecentlyViewed,
                            order: newOrder,
                        } = addToLRU(
                            state.recentlyViewed,
                            state.recentlyViewedOrder,
                            key,
                            position,
                            state.maxRecentlyViewed
                        );

                        set((prevState) => ({
                            ...prevState,
                            recentlyViewed: newRecentlyViewed,
                            recentlyViewedOrder: newOrder,
                            activePositionKey: key,
                        }));
                    } else {
                        // Position not found in store - just set as active
                        // Component will need to handle loading from API
                        set((prevState) => ({
                            ...prevState,
                            activePositionKey: key,
                        }));
                    }
                },

                refreshPosition: async (chain, nftId) => {
                    const key = getPositionKey(chain, nftId);

                    try {
                        // Set refreshing state
                        set((state) => ({
                            ...state,
                            isRefreshing: true,
                            currentList: {
                                ...state.currentList,
                                positions: {
                                    ...state.currentList.positions,
                                    [key]: state.currentList.positions[key]
                                        ? {
                                              ...state.currentList.positions[
                                                  key
                                              ],
                                              isRefreshing: true,
                                          }
                                        : state.currentList.positions[key],
                                },
                            },
                            recentlyViewed: {
                                ...state.recentlyViewed,
                                [key]: state.recentlyViewed[key]
                                    ? {
                                          ...state.recentlyViewed[key],
                                          isRefreshing: true,
                                      }
                                    : state.recentlyViewed[key],
                            },
                        }));

                        // Make API call to refresh endpoint
                        const response =
                            await apiClient.post<PositionRefreshResponse>(
                                `/api/positions/uniswapv3/${chain}/${nftId}/refresh`
                            );

                        if (
                            !response.data?.position ||
                            !response.data?.pnlBreakdown
                        ) {
                            throw new Error("Invalid refresh response");
                        }

                        // Create updated position with all data
                        const updatedPosition: PositionWithDetails = {
                            basicData: response.data.position,
                            pnlBreakdown: response.data.pnlBreakdown,
                            curveData: response.data.curveData, // May be undefined
                            lastUpdated: new Date().toISOString(),
                            isRefreshing: false,
                        };

                        // Update position EVERYWHERE in store
                        get().updatePositionEverywhere(key, updatedPosition);
                    } catch (error) {
                        console.error(
                            `Failed to refresh position ${key}:`,
                            error
                        );

                        // Clear refreshing state on error
                        set((state) => ({
                            ...state,
                            isRefreshing: false,
                            currentList: {
                                ...state.currentList,
                                positions: {
                                    ...state.currentList.positions,
                                    [key]: state.currentList.positions[key]
                                        ? {
                                              ...state.currentList.positions[
                                                  key
                                              ],
                                              isRefreshing: false,
                                          }
                                        : state.currentList.positions[key],
                                },
                            },
                            recentlyViewed: {
                                ...state.recentlyViewed,
                                [key]: state.recentlyViewed[key]
                                    ? {
                                          ...state.recentlyViewed[key],
                                          isRefreshing: false,
                                      }
                                    : state.recentlyViewed[key],
                            },
                        }));

                        throw error;
                    } finally {
                        set((state) => ({ ...state, isRefreshing: false }));
                    }
                },

                loadPositionDetails: async (chain, nftId) => {
                    const key = getPositionKey(chain, nftId);

                    try {
                        // TEMPORARY: Force fresh data load for debugging
                        // TODO: Remove this once APR calculation is working

                        const { apiClient } = await import(
                            "@/lib/app/apiClient"
                        );

                        // Call unified details endpoint
                        const response = await apiClient.get(
                            `/api/positions/uniswapv3/${chain}/${nftId}/details`
                        );

                        if (response.success && response.data) {
                            const {
                                basicData,
                                pnlBreakdown,
                                aprBreakdown,
                                curveData,
                            } = response.data;

                            // Create complete position object
                            const completePosition: PositionWithDetails = {
                                basicData,
                                pnlBreakdown,
                                aprBreakdown,
                                curveData,
                                isRefreshing: false,
                                lastUpdated: new Date().toISOString(),
                            };

                            // Update position everywhere in store
                            get().updatePositionEverywhere(
                                key,
                                completePosition
                            );

                            // Set as active position
                            get().navigateToPosition(chain, nftId);

                            return completePosition;
                        } else {
                            console.error(
                                `[Store] Failed to load position details: ${key}`,
                                response.error
                            );
                            return null;
                        }
                    } catch (error) {
                        console.error(
                            `[Store] Error loading position details: ${key}`,
                            error
                        );
                        return null;
                    }
                },

                updatePositionEverywhere: (key, updatedPosition) => {
                    set((state) => ({
                        ...state,
                        // Update in current list if present
                        currentList: {
                            ...state.currentList,
                            positions: state.currentList.positions[key]
                                ? {
                                      ...state.currentList.positions,
                                      [key]: updatedPosition,
                                  }
                                : state.currentList.positions,
                        },
                        // Update in recently viewed if present
                        recentlyViewed: state.recentlyViewed[key]
                            ? {
                                  ...state.recentlyViewed,
                                  [key]: updatedPosition,
                              }
                            : state.recentlyViewed,
                    }));
                },

                getPosition: (chain, nftId) => {
                    const key = getPositionKey(chain, nftId);
                    const state = get();

                    // Try current list first, then recently viewed
                    return (
                        state.currentList.positions[key] ||
                        state.recentlyViewed[key] ||
                        null
                    );
                },

                setListLoading: (loading) => {
                    set((state) => ({
                        ...state,
                        currentList: {
                            ...state.currentList,
                            isLoading: loading,
                        },
                    }));
                },

                setListError: (error) => {
                    set((state) => ({
                        ...state,
                        currentList: {
                            ...state.currentList,
                            error,
                        },
                    }));
                },

                clearRecentlyViewed: () => {
                    set((state) => ({
                        ...state,
                        recentlyViewed: {},
                        recentlyViewedOrder: [],
                    }));
                },
            }),
            {
                name: "duncan-position-store",
                // Only persist the recently viewed cache and active position
                partialize: (state) => ({
                    recentlyViewed: state.recentlyViewed,
                    recentlyViewedOrder: state.recentlyViewedOrder,
                    activePositionKey: state.activePositionKey,
                }),
            }
        ),
        { name: "position-store" }
    )
);

// Selector helpers for common use cases
export const useCurrentListPositions = () =>
    usePositionStore((state) => state.currentList.positions);

export const useCurrentListState = () =>
    usePositionStore((state) => state.currentList);

export const useActivePosition = () => {
    const activePositionKey = usePositionStore(
        (state) => state.activePositionKey
    );
    const getPosition = usePositionStore((state) => state.getPosition);

    if (!activePositionKey) return null;

    const [chain, nftId] = activePositionKey.split("-");
    return getPosition(chain, nftId);
};

export const usePositionRefresh = () => {
    const refreshPosition = usePositionStore((state) => state.refreshPosition);
    const isRefreshing = usePositionStore((state) => state.isRefreshing);

    return { refreshPosition, isRefreshing };
};
