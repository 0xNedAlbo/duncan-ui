# Mini PnL Curve Implementation Plan

## Overview

This document outlines the complete implementation plan for adding mini PnL curve visualizations to position cards in the DUNCAN liquidity risk management platform. The mini curves will provide users with instant visual feedback about their position's risk profile directly in the position list.

## Problem Statement

Currently, users can only see PnL numbers and percentages in the position cards. While informative, these numbers don't convey the underlying risk structure of Uniswap V3 positions. Users need to:

1. **Quickly identify position risk phases** (below range, in range, above range)
2. **Understand current position on the PnL curve** without opening detailed views
3. **Compare multiple positions visually** for portfolio risk assessment
4. **See the iconic Uniswap V3 asymmetric risk curve** at a glance

## Solution Architecture

### Core Components

```
MiniPnLCurve (React Component)
├── CurveDataService (Data Layer)
│   ├── Position Parameter Extraction
│   ├── Curve Point Generation
│   └── Cache Management
├── CurveRenderer (SVG Visualization)
│   ├── Path Generation
│   ├── Zone Coloring
│   ├── Range Indicators
│   └── Current Position Marker
└── PerformanceOptimization
    ├── Memoization
    ├── Lazy Loading
    └── Batch Processing
```

## Technical Specifications

### Component Design

**MiniPnLCurve Component**
- **Dimensions:** 120px × 60px (fixed)
- **Format:** Pure SVG (no external charting libraries)
- **Performance:** < 50ms initial render, < 10ms cached render
- **Data Points:** Maximum 30 points (optimized for performance)

### Visual Elements

1. **PnL Curve Line**
   - Color: White (#ffffff)
   - Width: 2px
   - Shape: Iconic three-phase Uniswap V3 curve

2. **Background Zones**
   - Red Zone (Phase 1 - Below Range): rgba(239, 68, 68, 0.1)
   - Green Zone (Phase 2 - In Range): rgba(34, 197, 94, 0.1) 
   - Yellow Zone (Phase 3 - Above Range): rgba(245, 158, 11, 0.1)

3. **Reference Lines**
   - Zero Line: Horizontal dashed line (#64748b)
   - Range Boundaries: Vertical lines (#06b6d4)
   - Current Price: Blue dot (#60a5fa, 4px radius)

4. **Responsive Scaling**
   - Auto-scale Y-axis based on PnL range
   - Fixed X-axis based on price range (±20% buffer)

## Implementation Plan

### Phase 1: Core Components (2-3 hours)

#### Step 1.1: Create MiniPnLCurve Component
**File:** `src/components/charts/mini-pnl-curve.tsx`

```typescript
interface MiniPnLCurveProps {
  position: PositionWithPnL;
  width?: number;
  height?: number;
  className?: string;
  showTooltip?: boolean;
}

interface CurvePoint {
  price: number;
  pnl: number;
  phase: 'below' | 'in-range' | 'above';
}
```

**Key Features:**
- Pure SVG implementation
- React.memo for performance
- Error boundaries for graceful failure
- TypeScript strict typing
- Optional tooltip on hover

#### Step 1.2: Create Curve Data Service
**File:** `src/services/positions/curveDataService.ts`

```typescript
interface CurveData {
  points: CurvePoint[];
  priceRange: { min: number; max: number };
  pnlRange: { min: number; max: number };
  currentPriceIndex: number;
  rangeIndices: { lower: number; upper: number };
}

class CurveDataService {
  generateCurveData(position: PositionWithPnL): CurveData
  calculatePnLAtPrice(position: PositionWithPnL, price: bigint): bigint
  extractPositionParams(position: PositionWithPnL): PositionParams
}
```

**Core Logic:**
- Use existing Uniswap V3 utilities (`calculatePositionValue`, `tickToPrice`)
- Generate 25-30 optimized curve points
- Calculate exact PnL using position liquidity and current prices
- Handle all three phases of the curve correctly

#### Step 1.3: Add Caching Layer
**File:** `src/lib/utils/curve-cache.ts`

```typescript
interface CachedCurveData extends CurveData {
  timestamp: number;
  positionId: string;
  priceHash: string;
}

class CurveCache {
  get(positionId: string, currentPrice: string): CachedCurveData | null
  set(positionId: string, currentPrice: string, data: CurveData): void
  invalidate(positionId: string): void
  cleanup(): void // Remove expired entries
}
```

**Cache Strategy:**
- **Key Format:** `curve_${positionId}_${priceHash}`
- **Storage:** localStorage (fallback to memory)
- **TTL:** 1 hour or until position refresh
- **Size Limit:** 5KB per position, max 100 positions
- **Expiration:** Automatic cleanup on app startup

### Phase 2: Integration (1 hour)

#### Step 2.1: Update PositionCard Component
**File:** `src/components/positions/position-card.tsx`

```typescript
// Add to existing PositionCard component structure
<div className="flex items-start gap-6 ml-6">
  {/* Existing Current Value display */}
  <div className="text-right">...</div>
  
  {/* New Mini PnL Curve */}
  <div className="flex items-center">
    <MiniPnLCurve 
      position={position}
      className="mr-4"
      showTooltip={true}
    />
  </div>
  
  {/* Existing PnL display */}
  <div className="text-right">...</div>
</div>
```

**Integration Points:**
- Place curve between current value and PnL displays
- Add loading skeleton for async curve generation
- Handle error states gracefully
- Maintain existing layout responsiveness

#### Step 2.2: Add Internationalization
**File:** `src/i18n/locales/en.json` and `src/i18n/locales/de.json`

```json
{
  "miniPnlCurve": {
    "tooltip": {
      "currentPrice": "Current Price",
      "pnlAtPrice": "PnL at Price",
      "phase": "Phase",
      "belowRange": "Below Range",
      "inRange": "In Range", 
      "aboveRange": "Above Range"
    },
    "loading": "Loading curve...",
    "error": "Unable to load curve"
  }
}
```

### Phase 3: Performance Optimization (1 hour)

#### Step 3.1: Implement Lazy Loading
```typescript
// Use Intersection Observer for viewport detection
const MiniPnLCurveContainer = ({ position }: Props) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoaded) {
          setIsVisible(true);
          setIsLoaded(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [isLoaded]);

  return (
    <div ref={ref}>
      {isVisible ? <MiniPnLCurve position={position} /> : <CurveSkeleton />}
    </div>
  );
};
```

#### Step 3.2: Add Batch Processing
```typescript
// Service for batch calculating multiple curves
class BatchCurveService {
  async calculateBatch(positions: PositionWithPnL[]): Promise<Map<string, CurveData>>
  async preloadVisibleCurves(positionIds: string[]): Promise<void>
}
```

#### Step 3.3: Memory Optimization
```typescript
// Implement cleanup and memory management
useEffect(() => {
  return () => {
    // Cleanup curve cache for unmounted positions
    CurveCache.cleanup();
  };
}, []);
```

## Data Flow Architecture

### 1. Position Data Extraction
```
PositionWithPnL → CurveDataService → PositionParams
├── liquidity: string
├── tickLower: number  
├── tickUpper: number
├── pool.currentPrice: string
├── pool.fee: number
├── token0IsQuote: boolean
├── pool.token0: TokenData
└── pool.token1: TokenData
```

### 2. Curve Generation Pipeline
```
PositionParams → Price Range Calculation → Point Generation → PnL Calculation
                                      ↓
Cache Check → [Hit] → Return Cached Data
           ↓ [Miss]
          Generate New Curve → Cache Result → Return Data
```

### 3. Rendering Pipeline
```
CurveData → SVG Path Generation → Zone Backgrounds → Reference Lines → Current Position Marker
                              ↓
                        Responsive Scaling → Final SVG
```

## Mathematical Foundation

### Curve Generation Algorithm

The mini curve uses the same mathematical foundation as the full PnL curve but optimized for performance:

```typescript
// Simplified curve generation (25 points instead of 150)
function generateOptimizedCurve(params: PositionParams): CurvePoint[] {
  const { lowerPrice, upperPrice } = params;
  const rangeWidth = upperPrice - lowerPrice;
  
  // Price range with 20% buffer (reduced from full curve's buffer)
  const minPrice = lowerPrice - (rangeWidth * 0.2);
  const maxPrice = upperPrice + (rangeWidth * 0.2);
  
  const points: CurvePoint[] = [];
  const numPoints = 25; // Optimized count
  const step = (maxPrice - minPrice) / numPoints;
  
  for (let i = 0; i <= numPoints; i++) {
    const price = minPrice + (i * step);
    const pnl = calculatePnLAtPrice(price, params);
    const phase = determinePhase(price, lowerPrice, upperPrice);
    
    points.push({ price, pnl, phase });
  }
  
  return points;
}
```

### PnL Calculation using Uniswap V3 Math

```typescript
function calculatePnLAtPrice(price: bigint, position: PositionWithPnL): bigint {
  // Use existing calculatePositionValue from liquidity.ts
  const currentValue = calculatePositionValue(
    BigInt(position.liquidity),
    priceToTick(price, position.pool.fee, ...tickParams),
    position.tickLower,
    position.tickUpper,
    price,
    !position.token0IsQuote, // baseIsToken0
    position.token0IsQuote ? position.pool.token1.decimals : position.pool.token0.decimals
  );
  
  return currentValue - BigInt(position.initialValue);
}
```

## Performance Benchmarks

### Target Performance Metrics

| Metric | Target | Measurement |
|--------|---------|-------------|
| Initial Render | < 50ms | First paint to completion |
| Cached Render | < 10ms | Cache hit to display |
| Curve Calculation | < 25ms | Data generation |
| Memory Usage | < 5KB | Per position cache |
| Batch Processing | < 200ms | 10 positions |

### Optimization Techniques

1. **Reduced Data Points:** 25 points vs 150 in full curve
2. **Memoization:** React.memo + useMemo for expensive calculations  
3. **Lazy Loading:** Only render curves in viewport
4. **Smart Caching:** Price-based cache invalidation
5. **SVG Optimization:** Minimal DOM elements
6. **Debounced Updates:** Rate-limit price change updates

## Testing Strategy

### Unit Tests
```typescript
// Test curve calculation accuracy
describe('CurveDataService', () => {
  test('generates correct three-phase curve shape', () => {
    // Test below range, in range, above range phases
  });
  
  test('calculates accurate PnL values', () => {
    // Compare with full curve implementation
  });
  
  test('handles edge cases', () => {
    // Zero liquidity, extreme prices, etc.
  });
});

// Test caching behavior
describe('CurveCache', () => {
  test('cache hit/miss scenarios', () => {});
  test('expiration and cleanup', () => {});
  test('storage limits', () => {});
});
```

### Integration Tests
```typescript
// Test component integration
describe('MiniPnLCurve Integration', () => {
  test('renders with real position data', () => {});
  test('handles loading and error states', () => {});
  test('tooltip interactions work correctly', () => {});
});
```

### Performance Tests
```typescript
// Benchmark curve generation
describe('Performance Benchmarks', () => {
  test('curve generation under 25ms', () => {});
  test('batch processing 10 positions under 200ms', () => {});
  test('memory usage stays under limits', () => {});
});
```

## Error Handling & Fallbacks

### Error Scenarios
1. **Invalid Position Data:** Missing required fields
2. **Calculation Errors:** Division by zero, overflow
3. **Cache Failures:** localStorage unavailable
4. **Rendering Errors:** SVG generation fails

### Fallback Strategy
```typescript
// Graceful degradation
const MiniPnLCurve = ({ position }: Props) => {
  try {
    return <CurveVisualization data={curveData} />;
  } catch (error) {
    console.warn('Mini curve failed:', error);
    return <SimplePnLIndicator pnl={position.pnl} />; // Fallback UI
  }
};
```

## Future Enhancements

### Phase 2 Features (Future)
1. **Interactive Tooltips:** Detailed hover information
2. **Click-to-Expand:** Open full curve view
3. **Animation:** Smooth transitions on price changes
4. **Comparison Mode:** Multi-position overlay
5. **Historical Curves:** Show PnL evolution over time

### Advanced Optimizations
1. **WebWorker Calculations:** Offload complex math
2. **Canvas Rendering:** For high-performance scenarios  
3. **Virtual Scrolling:** Handle hundreds of positions
4. **Predictive Caching:** Pre-calculate likely viewed positions

## Implementation Checklist

### Development Phase
- [ ] Create MiniPnLCurve component with SVG rendering
- [ ] Implement CurveDataService with Uniswap V3 math
- [ ] Add caching layer with localStorage
- [ ] Integrate into PositionCard component
- [ ] Add internationalization support
- [ ] Implement lazy loading and performance optimizations

### Testing Phase  
- [ ] Unit tests for curve calculation accuracy
- [ ] Integration tests with real position data
- [ ] Performance benchmarks
- [ ] Cross-browser compatibility testing
- [ ] Mobile responsiveness testing

### Deployment Phase
- [ ] Code review and optimization
- [ ] Documentation updates
- [ ] Feature flag implementation
- [ ] Gradual rollout strategy
- [ ] Performance monitoring setup

## Risk Assessment & Mitigation

### Technical Risks
1. **Performance Impact:** Mitigated by lazy loading and caching
2. **Memory Usage:** Controlled by cache limits and cleanup
3. **Calculation Accuracy:** Validated against existing curve implementation
4. **Browser Compatibility:** SVG has excellent support

### User Experience Risks
1. **Information Overload:** Kept minimal and optional
2. **Loading Delays:** Skeleton states and progressive enhancement
3. **Mobile Usability:** Responsive design and touch-friendly

## Success Metrics

### User Engagement
- Increased time on position list page
- Reduced clicks to detailed views
- Higher user satisfaction scores

### Technical Performance
- < 50ms render time achieved
- < 5KB memory usage per position
- Zero performance regressions

### Business Impact
- Enhanced risk awareness
- Better position management decisions  
- Improved platform stickiness

---

## Implementation Status Update

### ✅ **Completed Features**

All core components have been successfully implemented:

1. **MiniPnLCurve Component** - SVG-based visualization with three-phase curve ✅
2. **CurveDataService** - Uniswap V3 math integration with proper BigInt handling ✅  
3. **CurveCache** - localStorage caching with TTL and size management ✅
4. **MiniPnLCurveLazy** - Performance-optimized lazy loading wrapper ✅
5. **Internationalization** - English & German translations ✅
6. **PositionCard Integration** - Seamless layout integration ✅

**Files Created:**
- `src/components/charts/mini-pnl-curve.tsx` (Main component)
- `src/components/charts/mini-pnl-curve-lazy.tsx` (Lazy wrapper)
- `src/services/positions/curveDataService.ts` (Data service)
- `src/lib/utils/curve-cache.ts` (Caching system)

**Performance Features Delivered:**
- React.memo with custom comparison ✅
- Intersection Observer lazy loading ✅
- localStorage caching with automatic cleanup ✅
- Optimized 25-point curve generation ✅
- Skeleton loading states ✅

---

## Known Bugs & Issues

### 🐛 **Critical Bugs**

#### 1. **Incorrect Price Calculations in Curve Generation**
**Status:** ⚠️ Critical - Needs Immediate Fix

**Description:** The price calculations within the curve generation are significantly off, resulting in incorrect PnL curve shapes and misleading visual feedback.

**Root Cause Analysis:**
- `tickToPriceBigInt()` method in CurveDataService may be using wrong conversion logic
- Price range calculation (`minPrice`, `maxPrice`) appears to be generating unrealistic values
- Possible issues with tick-to-price conversion using simplified logarithmic approximation
- BigInt decimal handling may be causing precision loss during price calculations

**Impact:** 
- Users see incorrect risk visualization
- Curve shapes don't match actual Uniswap V3 position behavior
- Misleading investment decisions due to wrong PnL projections

**Evidence:**
```typescript
// Current problematic code in CurveDataService.ts:
const priceNumber = Math.pow(1.0001, tick); // Oversimplified
const tickAtPrice = Math.floor(Math.log(priceNumber) / Math.log(1.0001)); // Inaccurate
```

**Proposed Fix:** 
- Replace simplified tick/price conversions with proper Uniswap V3 SDK methods
- Use `tickToPrice()` and `priceToTick()` utilities correctly with token ordering
- Add comprehensive price calculation unit tests
- Validate against existing full PnL curve implementation

### 🐛 **Minor Bugs**

#### 2. **Cache Key Generation Edge Cases**
**Status:** 🟡 Low Priority

**Description:** Cache key generation may produce collisions for positions with similar price values.

**Impact:** Potential cache misses or incorrect cached curve data

#### 3. **Tooltip Position on Mobile**  
**Status:** 🟡 Low Priority

**Description:** Hover tooltips may appear off-screen on mobile devices with narrow viewports.

**Impact:** Poor mobile user experience, information not accessible

#### 4. **Loading State Flickering**
**Status:** 🟡 Low Priority  

**Description:** Brief flicker between skeleton and actual curve during lazy loading transition.

**Impact:** Minor visual annoyance, affects perceived performance

---

## Improvement Opportunities

### 🚀 **High Priority Enhancements**

#### 1. **Proper Uniswap V3 SDK Integration**
**Current State:** Using simplified approximations
**Target:** Full SDK integration with proper price/tick conversions

**Benefits:**
- Accurate price calculations matching Uniswap V3 exactly
- Eliminates custom approximation logic
- Better maintainability with official SDK

**Implementation:**
```typescript
import { Pool, Position } from '@uniswap/v3-sdk'
import { Token } from '@uniswap/sdk-core'

// Use real Pool and Position objects for calculations
const pool = new Pool(token0, token1, fee, sqrtPriceX96, liquidity, tickCurrent)
const position = new Position({ pool, liquidity, tickLower, tickUpper })
```

#### 2. **WebWorker Background Processing**
**Current State:** Main thread curve calculations
**Target:** Offload calculations to WebWorkers

**Benefits:**  
- Non-blocking UI during curve generation
- Better performance for multiple positions
- Smoother scrolling and interactions

#### 3. **Advanced Caching Strategy**
**Current State:** Simple localStorage with TTL
**Target:** Multi-layer caching with intelligent invalidation

**Enhancements:**
- Memory cache (L1) + localStorage (L2)
- Price-based smart invalidation
- Predictive caching for likely viewed positions
- Cache warming strategies

### 🎯 **Medium Priority Enhancements**

#### 4. **Interactive Curve Features**  
**Current State:** Static visualization with basic tooltips
**Target:** Interactive curve manipulation

**Features:**
- Click-to-zoom functionality
- Range adjustment preview
- Price scenario simulation
- Multiple position overlay comparison

#### 5. **Real-time Price Updates**
**Current State:** Static price at load time
**Target:** Live price streaming integration

**Implementation:**
- WebSocket price feeds integration
- Smooth curve animation on price changes
- Debounced updates to prevent performance issues

#### 6. **Advanced Visualization Options**
**Current State:** Single curve style
**Target:** Multiple visualization modes

**Options:**
- Density plots for probability distributions
- Historical PnL overlay
- Risk heatmap mode
- Compact/expanded view toggles


---

## Technical Debt & Refactoring

### 🔧 **Code Quality Issues**

#### 1. **Price Conversion Utilities Consolidation**
**Issue:** Duplicate price/tick conversion logic across files
**Solution:** Centralize in dedicated utility module

#### 2. **Error Handling Standardization**  
**Issue:** Inconsistent error handling patterns
**Solution:** Implement unified error handling strategy

#### 3. **Type Safety Improvements**
**Issue:** Some BigInt/number conversions lack proper type guards
**Solution:** Add comprehensive type validation


---

## Testing Strategy Expansion

### 🧪 **Missing Test Coverage**

#### 1. **Price Calculation Accuracy Tests**
```typescript
describe('CurveDataService Price Calculations', () => {
  test('should match Uniswap V3 SDK calculations exactly', () => {
    // Compare against official SDK results
  });
  
  test('should handle extreme price ranges correctly', () => {
    // Test edge cases with very high/low prices
  });
});
```

#### 2. **Cache Behavior Tests**
```typescript  
describe('CurveCache Edge Cases', () => {
  test('should handle storage quota exceeded gracefully', () => {});
  test('should prevent cache pollution attacks', () => {});
});
```

#### 3. **Performance Regression Tests**
```typescript
describe('Performance Benchmarks', () => {
  test('curve generation should complete under 50ms', () => {});
  test('cache retrieval should complete under 10ms', () => {});
});
```

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding mini PnL curves to position cards. The solution balances visual clarity, performance, and maintainability while staying true to DUNCAN's core philosophy of risk-aware position management.

The modular architecture allows for incremental implementation and future enhancements, while the caching strategy ensures excellent performance even with many positions. The mini curves will give users instant visual feedback about their positions' risk profiles, enhancing the overall user experience without compromising the platform's performance standards.