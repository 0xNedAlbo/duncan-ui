# Midcurve Position Creation Wizard - Comprehensive Implementation Plan

## Project Context

**Midcurve** is an innovative DeFi risk management tool focused on Uniswap V3 liquidity positions. The platform emphasizes **position planning, risk visualization, and hedging strategies** through integrated analytics and visual tools.

### Current State Analysis

Based on comprehensive codebase research, the current position creation flow is limited to:
- **Import existing positions** via NFT ID
- **Discover positions** from connected wallets
- **Manual configuration** (placeholder - not implemented)

The existing PnL curve visualization (`src/components/pnl-curve.tsx`) provides static analysis but lacks interactivity and comprehensive risk planning capabilities.

## Vision: Comprehensive Position Creation Assistant

Transform position creation from a simple import-based workflow into a **comprehensive, educational, and risk-aware planning tool** that guides users through every aspect of position creation with enhanced visualization and risk analysis.

## Detailed Implementation Plan

### Phase 1: Core Wizard Infrastructure

#### 1.1 Main Wizard Components (`src/components/positions/wizard/`)

**PositionWizard.tsx** - Main Container
```typescript
interface PositionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onPositionCreated?: (position: any) => void;
}

interface WizardState {
  currentStep: number;
  selectedChain: SupportedChainsType | null;
  selectedTokenPair: TokenPair | null;
  selectedPool: PoolWithTokens | null;
  positionConfig: PositionConfig | null;
}
```

Key Features:
- Multi-step navigation with progress indicator
- State management for wizard flow
- Back/forward navigation with validation
- Integration with existing auth patterns
- Mobile-responsive design following glassmorphism theme

**ChainSelectionStep.tsx** - Blockchain Selection
```typescript
interface ChainSelectionStepProps {
  selectedChain: SupportedChainsType | null;
  onChainSelect: (chain: SupportedChainsType) => void;
  onNext: () => void;
}
```

Features:
- Visual chain selection cards (Ethereum, Arbitrum, Base)
- Chain-specific information (fees, block times, etc.)
- Integration with existing `src/config/chains.ts`
- Validation and error handling

**TokenPairStep.tsx** - Token Selection
```typescript
interface TokenPairStepProps {
  chain: SupportedChainsType;
  selectedPair: TokenPair | null;
  onPairSelect: (pair: TokenPair) => void;
  onNext: () => void;
  onBack: () => void;
}

interface TokenPair {
  baseToken: Token;
  quoteToken: Token;
  isValidPair: boolean;
}
```

Features:
- Token search with autocomplete
- Popular token pair suggestions
- Base/Quote token role explanation
- Integration with existing `TokenService`
- Token metadata display (logos, symbols, names)
- EVM address validation using existing utils

**PoolSelectionStep.tsx** - Pool Discovery
```typescript
interface PoolSelectionStepProps {
  tokenPair: TokenPair;
  availablePools: PoolOption[];
  selectedPool: PoolOption | null;
  onPoolSelect: (pool: PoolOption) => void;
  onNext: () => void;
  onBack: () => void;
}

interface PoolOption {
  pool: PoolWithTokens;
  fee: number;
  feePercentage: string;
  tickSpacing: number;
  liquidity: bigint;
  volume24h?: bigint;
  tvl?: bigint;
}
```

Features:
- Display available pools for token pair
- Fee tier comparison (0.01%, 0.05%, 0.3%, 1%)
- Pool metrics (liquidity, volume, TVL)
- Recommendations based on liquidity/volume
- Integration with Uniswap V3 Factory contract

**PositionConfigStep.tsx** - Enhanced Configuration
```typescript
interface PositionConfigStepProps {
  pool: PoolWithTokens;
  config: PositionConfig | null;
  onConfigChange: (config: PositionConfig) => void;
  onCreatePosition: () => void;
  onBack: () => void;
}

interface PositionConfig {
  lowerPrice: bigint;
  upperPrice: bigint;
  liquidityAmount: bigint;
  baseTokenAmount: bigint;
  quoteTokenAmount: bigint;
  expectedFees: bigint;
  riskMetrics: RiskMetrics;
}
```

Features:
- **Enhanced PnL curve** with heatmap overlay
- **Scrollable/zoomable** price visualization
- **Real-time position simulation**
- Risk metrics calculation and display
- Position size slider with dynamic updates

#### 1.2 Enhanced PnL Visualization (`src/components/charts/`)

**InteractivePnLCurve.tsx** - New Interactive Curve
```typescript
interface InteractivePnLCurveProps {
  pool: PoolWithTokens;
  config: PositionConfig;
  heatmapData: HeatmapData;
  onConfigChange: (config: PositionConfig) => void;
  width?: number;
  height?: number;
}
```

Key Features:
- **D3.js or Recharts** based implementation for smooth interactions
- **Zoom and pan** functionality across price ranges
- **Real-time curve updates** as parameters change
- **Three-phase visualization**: Below Range (red), In Range (green), Above Range (yellow)
- **Current price indicator** with market data
- **Range boundary markers** that can be dragged to adjust position

**PnLHeatmap.tsx** - Liquidity/Volume Overlay
```typescript
interface PnLHeatmapProps {
  pool: PoolWithTokens;
  priceRange: { min: bigint; max: bigint };
  data: HeatmapData;
}

interface HeatmapData {
  pricePoints: bigint[];
  liquidityDistribution: bigint[];
  historicalVolume: bigint[];
  tradingActivity: TradingActivity[];
}
```

Features:
- **Heatmap overlay** showing liquidity concentration
- **Historical volume patterns** at different price levels
- **Trading activity hotspots** visualization
- **Opacity-based intensity** mapping
- **Tooltip information** for data points

**CurveControls.tsx** - Interactive Controls
```typescript
interface CurveControlsProps {
  currentZoom: number;
  priceRange: { min: bigint; max: bigint };
  onZoomChange: (zoom: number) => void;
  onRangeChange: (range: { min: bigint; max: bigint }) => void;
  onResetView: () => void;
}
```

Features:
- Zoom in/out controls
- Price range selection
- View reset functionality
- Preset zoom levels (1x, 2x, 5x, 10x)

#### 1.3 Position Size Configuration

**PositionSizeSlider.tsx** - Dynamic Sizing
```typescript
interface PositionSizeSliderProps {
  maxAmount: bigint;
  currentAmount: bigint;
  tokenSymbol: string;
  onAmountChange: (amount: bigint) => void;
  showUSDValue?: boolean;
}
```

Features:
- Logarithmic slider for position sizes
- Real-time USD value display
- Token amount validation
- Integration with wallet balance (future)

### Phase 2: Backend Services & APIs

#### 2.1 New Services (`src/services/`)

**PoolDiscoveryService.ts**
```typescript
class PoolDiscoveryService {
  async findPoolsForTokenPair(
    chain: SupportedChainsType,
    tokenA: string,
    tokenB: string
  ): Promise<PoolOption[]>;

  async getPoolLiquidity(
    chain: SupportedChainsType,
    poolAddress: string
  ): Promise<LiquidityData>;

  async getPoolVolume24h(
    chain: SupportedChainsType,
    poolAddress: string
  ): Promise<bigint>;
}
```

**LiquidityHeatmapService.ts**
```typescript
class LiquidityHeatmapService {
  async getHistoricalLiquidity(
    poolAddress: string,
    priceRange: { min: bigint; max: bigint },
    timeframe: '24h' | '7d' | '30d'
  ): Promise<HeatmapData>;

  async getVolumeDistribution(
    poolAddress: string,
    priceRange: { min: bigint; max: bigint }
  ): Promise<VolumeDistribution>;
}
```

**PositionSimulationService.ts**
```typescript
class PositionSimulationService {
  async simulatePosition(
    pool: PoolWithTokens,
    config: PositionConfig
  ): Promise<SimulationResult>;

  async calculateRiskMetrics(
    position: PositionConfig
  ): Promise<RiskMetrics>;
}

interface RiskMetrics {
  impermanentLossAtPrices: { price: bigint; loss: number }[];
  maxDrawdown: number;
  expectedAPR: number;
  volatilityRisk: number;
  liquidityRisk: number;
}
```

#### 2.2 API Endpoints (`src/app/api/`)

**Pool Discovery APIs**
- `GET /api/pools/discover?chain={chain}&tokenA={address}&tokenB={address}`
- `GET /api/pools/[poolAddress]/metrics?chain={chain}`
- `GET /api/pools/[poolAddress]/heatmap?chain={chain}&range={min}-{max}&timeframe={period}`

**Position Simulation APIs**
- `POST /api/positions/simulate` - Real-time position simulation
- `POST /api/positions/risk-analysis` - Risk metrics calculation

### Phase 3: Integration & Enhancement

#### 3.1 Wizard Integration

**Update CreatePositionDropdown.tsx**
```typescript
// Add wizard launch option
<button
  onClick={() => {
    setIsDropdownOpen(false);
    onWizardOpen?.();
  }}
  className="w-full px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
>
  <div className="text-left">
    <div className="font-medium">
      {t("dashboard.addPosition.wizard.title")}
    </div>
    <div className="text-xs text-slate-400">
      {t("dashboard.addPosition.wizard.description")}
    </div>
  </div>
</button>
```

#### 3.2 Data Integration

**Extend existing services**
- Enhance `PoolService` with pool discovery capabilities
- Extend `TokenService` with search and popular pairs
- Integrate with existing `PnL` calculation utilities
- Maintain BigInt precision throughout all calculations

#### 3.3 UI/UX Enhancements

**Consistent Design Language**
- Dark theme with glassmorphism effects
- German localization ("Du/Deine" informal form)
- Mobile-responsive design
- Loading states and error handling
- Progress indicators and step validation

### Phase 4: Advanced Features

#### 4.1 Risk Analysis Integration

**Three-Phase Risk Visualization**
- **Phase 1 (Below Range)**: Linear downside risk visualization
- **Phase 2 (In Range)**: Impermanent loss and fee collection balance
- **Phase 3 (Above Range)**: Capped upside indication

**Educational Overlays**
- Risk explanation tooltips
- Phase transition indicators
- Historical performance context

#### 4.2 Advanced Interactions

**Drag-and-Drop Range Adjustment**
- Visual range boundary manipulation
- Real-time PnL curve updates
- Snap-to-tick functionality
- Price level suggestions

**Preset Strategies**
- Conservative (tight ranges, stable pairs)
- Moderate (medium ranges, major pairs)
- Aggressive (wide ranges, volatile pairs)

## Technical Implementation Details

### Architecture Principles

**State Management**
- React state for wizard flow
- React Query for API data
- Local state for interactive components

**Data Flow**
- BigInt preservation throughout calculation chain
- Proper error handling and validation
- Optimistic updates where appropriate

**Performance Optimization**
- Memoized curve calculations
- Efficient rendering for interactive charts
- Debounced real-time updates

### Code Organization

```
src/
├── components/
│   └── positions/
│       └── wizard/
│           ├── PositionWizard.tsx
│           ├── ChainSelectionStep.tsx
│           ├── TokenPairStep.tsx
│           ├── PoolSelectionStep.tsx
│           └── PositionConfigStep.tsx
├── components/
│   └── charts/
│       ├── InteractivePnLCurve.tsx
│       ├── PnLHeatmap.tsx
│       ├── CurveControls.tsx
│       └── PositionSizeSlider.tsx
├── services/
│   ├── PoolDiscoveryService.ts
│   ├── LiquidityHeatmapService.ts
│   └── PositionSimulationService.ts
└── app/api/
    └── pools/
        ├── discover/route.ts
        ├── [poolAddress]/
        │   ├── metrics/route.ts
        │   └── heatmap/route.ts
        └── simulate/route.ts
```

### Dependencies & Libraries

**New Dependencies**
- `d3-scale`, `d3-zoom` for advanced chart interactions
- Additional Recharts components for heatmap visualization
- Lodash utilities for data processing and debouncing

**Existing Infrastructure**
- Leverages current authentication system
- Uses established API patterns with `withAuthAndLogging`
- Integrates with existing database schema
- Maintains consistency with current UI components

## Success Metrics

**User Experience**
- Reduction in position creation errors
- Increased user engagement with risk visualization
- Educational value through interactive exploration

**Technical Performance**
- Smooth real-time interactions (>60fps)
- Fast API response times (<500ms)
- Efficient data caching and invalidation

**Business Value**
- Enhanced user understanding of position risks
- Increased platform engagement and retention
- Foundation for advanced risk management features

## Implementation Timeline

**Phase 1**: Core wizard infrastructure (2-3 weeks)
**Phase 2**: Backend services and APIs (1-2 weeks)
**Phase 3**: Integration and testing (1 week)
**Phase 4**: Advanced features and polish (1-2 weeks)

**Total Estimated Timeline**: 5-8 weeks

## Future Enhancements

**Hyperliquid Integration**
- Hedging strategy recommendations
- Automated hedge position creation
- Risk-adjusted portfolio management

**Advanced Analytics**
- ML-based price prediction overlays
- Historical performance benchmarking
- Social trading features and strategy sharing

**Mobile Application**
- Native mobile apps with position monitoring
- Push notifications for risk thresholds
- Simplified mobile-first position creation

This comprehensive plan transforms Midcurve from a position tracking tool into a sophisticated position planning and risk management platform, aligning perfectly with the project's vision of innovative DeFi risk management.

---

## Pool Selection Step Implementation Plan (Implementation Phase)

### Overview
Implement the pool selection step in the position wizard that uses the Uniswap V3 Factory to discover available pools for the selected token pair and displays them with relevant metrics.

### Current State Analysis
- Token pair selection step is complete and working
- Pool selection step exists but only shows mock data
- Infrastructure exists with Uniswap V3 Factory contract utilities and `getPoolAddress` method in position service
- No dedicated pool discovery API exists yet

### Available Components
- `UNISWAP_V3_FACTORY_ABI` and `UNISWAP_V3_FACTORY_ADDRESSES` from `/src/lib/contracts/uniswapV3Factory.ts`
- `getPoolAddress` method in `PositionService` that queries the factory for pool addresses
- `SUPPORTED_FEE_TIERS` (100, 500, 3000, 10000) and utility functions for formatting
- `PoolService` with pool creation and state management capabilities

### Implementation Steps

#### 1. Create Pool Discovery Service
- **New file**: `src/services/pools/poolDiscoveryService.ts`
- **Key methods**:
  - `findPoolsForTokenPair()` - Query factory for all fee tiers (100, 500, 3000, 10000)
  - `getPoolMetrics()` - Fetch liquidity, volume, and TVL data for each pool
  - `enrichPoolData()` - Create/update pool records in database

#### 2. Create Pool Discovery API
- **New file**: `src/app/api/pools/discover/route.ts`
- **Endpoint**: `GET /api/pools/discover?chain={chain}&tokenA={address}&tokenB={address}`
- **Features**:
  - Use `withAuthAndLogging()` wrapper for authentication
  - Query Uniswap V3 Factory for each fee tier
  - Return pool options with metrics (liquidity, volume24h, TVL)
  - Handle zero address responses (non-existent pools)

#### 3. Update Pool Selection Step Component
- **File**: `src/components/positions/wizard/PoolSelectionStep.tsx`
- **Changes**:
  - Replace mock data with API call using React Query
  - Implement real pool selection logic
  - Add loading states and error handling
  - Show "No pools available" state when appropriate
  - Enhance pool metrics display with real data

#### 4. Create React Query Hook
- **New file**: `src/hooks/api/usePoolDiscovery.ts`
- **Features**:
  - Fetch available pools for token pair
  - Cache results appropriately
  - Handle loading and error states
  - Auto-refetch on token pair changes

#### 5. Extend Pool Service
- **File**: `src/services/pools/poolService.ts`
- **New methods**:
  - `findPoolsForTokenPair()` - Leverage existing `getPoolAddress()` method
  - `getPoolMetrics()` - Fetch liquidity and state data
  - `enrichPoolWithMetrics()` - Combine pool data with metrics

### Technical Details

**Pool Discovery Logic:**
1. For each fee tier (100, 500, 3000, 10000), query factory.getPool()
2. Filter out zero addresses (non-existent pools)
3. For existing pools, fetch current state (liquidity, sqrtPriceX96)
4. Optionally fetch 24h volume from external sources
5. Return sorted by liquidity (highest first)

**Data Flow:**
1. User selects token pair → triggers pool discovery
2. API queries factory for all fee tiers in parallel
3. Filters existing pools and fetches metrics
4. Returns enriched pool options
5. Component displays pools with recommendation logic

**Error Handling:**
- Handle factory query failures gracefully
- Show appropriate messages for unsupported chains
- Handle network errors with retry functionality
- Fallback to cached data when possible

**BigInt Precision Requirements:**
- All liquidity, volume, and TVL values stored as BigInt strings
- Only convert to human-readable format in UI components
- Maintain precision throughout service → API → frontend chain

This implementation will transform the pool selection step from mock data to a fully functional interface that discovers real Uniswap V3 pools using the factory contract.