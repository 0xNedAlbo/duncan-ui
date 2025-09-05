import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// Types for DUNCAN Risk Management
export type BaseAsset = {
  address: string
  symbol: string
  decimals: number
  chainId: number
}

export type QuoteAsset = BaseAsset

export type PositionRange = {
  lowerTick: number
  upperTick: number
  lowerPrice: bigint // Price in quote asset terms (with decimals)
  upperPrice: bigint // Price in quote asset terms (with decimals)
}

export type UniswapV3Position = {
  id?: string
  baseAsset: BaseAsset
  quoteAsset: QuoteAsset
  chainId: number
  positionSize: bigint // in quote asset terms (with decimals)
  entryPrice: bigint // Price in quote asset terms (with decimals)
  range: PositionRange
  createdAt?: Date
}

export type RiskMetrics = {
  maxLoss: bigint // in quote asset (with decimals)
  maxGain: bigint // in quote asset (with decimals)
  breakEvenFees: bigint // fees needed to offset IL (with decimals)
  riskRewardRatio: bigint // scaled by 1e18 for precision
}

export type PositionState = {
  // Current position being planned
  currentPosition: UniswapV3Position | null
  
  // Position history
  positionHistory: UniswapV3Position[]
  
  // UI state
  selectedChain: number
  isCalculating: boolean
  
  // Risk metrics
  riskMetrics: RiskMetrics | null
  
  // Actions
  setCurrentPosition: (position: UniswapV3Position | null) => void
  updatePositionSize: (size: bigint) => void
  updatePriceRange: (range: PositionRange) => void
  updateEntryPrice: (price: bigint) => void
  setSelectedChain: (chainId: number) => void
  setRiskMetrics: (metrics: RiskMetrics | null) => void
  addToHistory: (position: UniswapV3Position) => void
  clearCurrentPosition: () => void
}

export const usePositionStore = create<PositionState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentPosition: null,
      positionHistory: [],
      selectedChain: 42161, // Arbitrum as default
      isCalculating: false,
      riskMetrics: null,

      // Actions
      setCurrentPosition: (position) => 
        set({ currentPosition: position }),

      updatePositionSize: (size) => 
        set((state) => ({
          currentPosition: state.currentPosition 
            ? { ...state.currentPosition, positionSize: size }
            : null
        })),

      updatePriceRange: (range) =>
        set((state) => ({
          currentPosition: state.currentPosition
            ? { ...state.currentPosition, range }
            : null
        })),

      updateEntryPrice: (price) =>
        set((state) => ({
          currentPosition: state.currentPosition
            ? { ...state.currentPosition, entryPrice: price }
            : null
        })),

      setSelectedChain: (chainId) => 
        set({ selectedChain: chainId }),

      setRiskMetrics: (metrics) => 
        set({ riskMetrics: metrics }),

      addToHistory: (position) =>
        set((state) => ({
          positionHistory: [position, ...state.positionHistory.slice(0, 9)] // Keep last 10
        })),

      clearCurrentPosition: () =>
        set({ currentPosition: null, riskMetrics: null })
    }),
    { name: 'duncan-position-store' }
  )
)