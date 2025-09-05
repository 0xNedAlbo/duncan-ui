/**
 * PnL Calculations for Uniswap V3 Positions
 * Simplified version - will be replaced with Uniswap V3 SDK later
 */

export interface PnLPoint {
  price: number
  positionValue: number
  pnl: number
  pnlPercent: number
  phase: 'below' | 'in-range' | 'above'
}

export interface PositionParams {
  initialBaseAmount: number
  initialQuoteAmount: number
  entryPrice: number
  lowerPrice: number
  upperPrice: number
}

/**
 * Calculate position value at a given price
 * Uses simplified Uniswap V3 math - to be replaced with SDK
 */
export function calculatePositionValue(
  price: number, 
  params: PositionParams
): number {
  const { initialBaseAmount, initialQuoteAmount, entryPrice, lowerPrice, upperPrice } = params
  
  // Calculate initial total value
  const initialValue = initialBaseAmount * entryPrice + initialQuoteAmount
  
  // Calculate liquidity from initial position (at entry price)
  const sqrtEntry = Math.sqrt(entryPrice)
  const sqrtLower = Math.sqrt(lowerPrice)
  const sqrtUpper = Math.sqrt(upperPrice)
  const liquidity = initialValue / (2 * sqrtEntry - sqrtLower - entryPrice / sqrtUpper)
  
  // Use consistent Uniswap V3 formula for all phases
  const sqrtPrice = Math.sqrt(price)
  
  // Phase 1: Below Range (100% Base Asset)
  if (price < lowerPrice) {
    // All liquidity is in base asset
    const baseTokens = liquidity * (sqrtUpper - sqrtLower) / (sqrtLower * sqrtUpper)
    return baseTokens * price
  }
  
  // Phase 3: Above Range (100% Quote Asset)  
  if (price > upperPrice) {
    // All liquidity is in quote asset
    const quoteTokens = liquidity * (sqrtUpper - sqrtLower)
    return quoteTokens
  }
  
  // Phase 2: In Range (Mixed - Rebalancing)
  // Standard Uniswap V3 formula
  const value = liquidity * (2 * sqrtPrice - sqrtLower - price / sqrtUpper)
  
  return Math.max(0, value)
}

/**
 * Generate PnL curve data points
 */
export function generatePnLCurve(
  params: PositionParams,
  bufferPercent: number = 0.2,
  numPoints: number = 150
): PnLPoint[] {
  const { entryPrice, lowerPrice, upperPrice, initialBaseAmount, initialQuoteAmount } = params
  
  // Calculate display range with buffer
  const rangeWidth = upperPrice - lowerPrice
  const minPrice = lowerPrice - (rangeWidth * bufferPercent)
  const maxPrice = upperPrice + (rangeWidth * bufferPercent)
  
  // Initial total value for PnL calculation
  const initialValue = initialBaseAmount * entryPrice + initialQuoteAmount
  
  const points: PnLPoint[] = []
  const step = (maxPrice - minPrice) / numPoints
  
  for (let i = 0; i <= numPoints; i++) {
    const price = minPrice + (i * step)
    const positionValue = calculatePositionValue(price, params)
    const pnl = positionValue - initialValue
    const pnlPercent = (pnl / initialValue) * 100
    
    let phase: 'below' | 'in-range' | 'above'
    if (price < lowerPrice) {
      phase = 'below'
    } else if (price > upperPrice) {
      phase = 'above'
    } else {
      phase = 'in-range'
    }
    
    points.push({
      price,
      positionValue,
      pnl,
      pnlPercent,
      phase
    })
  }
  
  return points
}

/**
 * Example WETH/USDC position parameters
 */
export function getExamplePosition(): PositionParams {
  return {
    initialBaseAmount: 1.134, // WETH
    initialQuoteAmount: 5008, // USDC  
    entryPrice: 4400, // WETH price in USDC
    lowerPrice: 3950,
    upperPrice: 4900
  }
}