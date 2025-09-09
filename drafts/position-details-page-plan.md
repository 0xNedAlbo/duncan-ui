# Position Details Page Implementation Plan

## ✅ **IMPLEMENTATION STATUS: STRUCTURE COMPLETE**

**Phase 1 Complete**: Route structure, header, and tab navigation fully implemented with new URL schema.

## Architecture Overview
- **Route**: `/position/uniswapv3/[chain]/[nft]` with tab-based navigation ✅ **IMPLEMENTED**
- **URL Schema**: 
  - `/position/uniswapv3/ethereum/12345` (default overview tab)
  - `/position/uniswapv3/arbitrum/67890?tab=events`
  - `/position/uniswapv3/base/54321?tab=range`
- **URL Query Parameters**: `?tab=overview` (default), `?tab=events`, `?tab=range`, `?tab=fees`, `?tab=analytics` ✅ **IMPLEMENTED**
- **Chain Validation**: Chain slugs validated against supported chains (ethereum, arbitrum, base) ✅ **IMPLEMENTED**
- **NFT ID Validation**: Must be numeric, returns 404 for invalid IDs ✅ **IMPLEMENTED**
- **Data Fetching**: Server-side position data with client-side real-time updates
- **Components**: Modular tab components with shared layout ✅ **IMPLEMENTED**

## Important Rule: Value Denomination
**All position values, balances, and PnL are displayed in quote token amounts only (e.g., USDC, WETH), never in USD or other fiat currencies. This maintains consistency with the risk framework where all calculations are in quote token units.**

## Page 1: Overview Tab (Default) - Comprehensive Feature List

### 1. **Position Header Section** ✅ **IMPLEMENTED**
- Token pair display with logos (e.g., WETH/USDC) ✅
- Chain badge (Ethereum/Arbitrum/Base) ✅  
- Fee tier badge (0.05%, 0.30%, 1.00%) ✅
- NFT ID with copy button and explorer link ✅
- Position status badge (Active/Closed/Liquidated) ✅
- Last updated timestamp with refresh button ✅
- Back navigation to dashboard ✅

### 2. **Current Value & PnL Summary Card**
- **Current Position Value** in quote token (e.g., "69,153.79 USDC")
- **Initial Investment Value** in quote token
- **Total PnL** in quote token (amount + percentage)
- **PnL Breakdown** (all in quote token):
  - Asset value change
  - Collected fees (realized)
  - Unclaimed fees (unrealized)
  - Realized vs Unrealized PnL
- **Visual PnL indicator** (profit/loss/breakeven)
- **Interactive PnL curve** (full-size version of mini curve)

### 3. **Range Status Card**
- **Current Status**: In-range/Out-of-range indicator with color coding
- **Range Boundaries** (in price ratio):
  - Lower price boundary (e.g., "1,850 USDC per WETH")
  - Upper price boundary (e.g., "2,150 USDC per WETH")
  - Current pool price
  - Entry price (when position was created)
- **Range Utilization**: Percentage of time in range
- **Distance to Boundaries**: How far current price is from range edges (percentage)
- **Visual Range Chart**: Price chart showing position range vs current price

### 4. **Pool State Information**
- **Current Pool Price** (quote per base, e.g., "2,000 USDC per WETH")
- **Current Tick** value
- **Pool Liquidity** (total in quote token)
- **Position Liquidity** share percentage
- **24h Volume** in quote token (if available from subgraph)
- **24h Fees Generated** in quote token (pool-wide)
- **TVL** (Total Value Locked) in quote token

### 5. **Position Composition**
- **Current Token Balances**:
  - Token0 amount (e.g., "15.5 WETH")
  - Token1 amount (e.g., "31,000 USDC")
  - Percentage split (e.g., "70% WETH, 30% USDC")
  - Total value in quote token (e.g., "62,000 USDC equivalent")
- **Initial Token Balances** (at position creation)
- **Balance Changes** (delta from initial)
- **Visual Pie Chart** of current composition (by quote token value)

### 6. **Quick Actions Bar**
- **Add Liquidity** button
- **Remove Liquidity** button
- **Collect Fees** button
- **View on Uniswap** link
- **View on Explorer** link
- **Export Data** (CSV/JSON)

### 7. **Data Quality Indicators**
- **Data Source**: Subgraph/Snapshot/Event-based
- **Confidence Level**: Exact/Estimated
- **Event Sync Status**: Last sync time, event count
- **Initial Value Source**: How initial value was determined

## Page 2: Events History Tab (`?tab=events`) - Initial Implementation ✅ **TAB STRUCTURE IMPLEMENTED**

### 1. **Events Timeline Header**
- Total event count
- Date range (first event to latest)
- Filter dropdown (All/Mints/Burns/Collects)
- Search by transaction hash

### 2. **Event List (Chronological)**
Each event card shows:
- **Event Type Icon** (Mint/Burn/Collect/Increase/Decrease)
- **Timestamp** (relative and absolute)
- **Event Details**:
  - For Mints/Increases: Liquidity added, tokens deposited (with quote token value)
  - For Burns/Decreases: Liquidity removed, tokens withdrawn (with quote token value)
  - For Collects: Fees collected in each token (with total in quote token)
- **Value at Transaction** in quote token (e.g., "5,234.56 USDC")
- **Transaction Hash** with explorer link
- **Gas Used & Cost** (in native token, e.g., "0.01 ETH")
- **Running PnL** in quote token after this event

### 3. **Event Statistics Summary**
- Total mints/increases count
- Total burns/decreases count
- Total fee collections in quote token
- Average time between collections
- Most active period

### 4. **Visual Timeline**
- Interactive timeline chart showing events
- Color-coded by event type
- Value/liquidity changes visualization (in quote token)

## Additional Tabs (Future Implementation)

### Tab 3: Range Analysis (`?tab=range`)
- Detailed range optimization analysis
- Historical price movement within range
- Range adjustment recommendations
- Backtesting different ranges
- All values in quote token

### Tab 4: Fees & Returns (`?tab=fees`)
- Fee collection history in quote token
- APR/APY calculations
- Fee accumulation chart (quote token denominated)
- Optimal collection timing

### Tab 5: Analytics (`?tab=analytics`)
- Performance charts over time (in quote token)
- Comparison with HODL strategy (in quote token)
- Returns analysis (quote token based)
- Correlation analysis

### Tab 6: Risk Metrics (Future)
- **Impermanent Loss**: Percentage and quote token value
- **Maximum Downside**: Worst-case scenario in quote token
- **Break-even Price**: Price needed to recover initial quote token investment
- **Risk Score**: Visual indicator (Low/Medium/High)
- **Days Until Break-even** (based on current fee rate in quote token)
- **Risk scenarios & simulations** (all in quote token)

## Technical Implementation Details

### API Endpoints Required
- `GET /api/positions/nft/[chain]/[nftId]` - Fetch complete position details by chain and NFT ID (BigInt strings)
- `GET /api/positions/nft/[chain]/[nftId]/events` - Fetch position events (paginated)
- `POST /api/positions/nft/[chain]/[nftId]/refresh` - Refresh position data
- `GET /api/pools/[poolId]/stats` - Fetch pool statistics

**Note**: New API endpoints needed to support chain/NFT ID routing instead of internal position IDs.

### Value Formatting Rules
- Use `formatFractionHuman()` from `src/lib/utils/fraction-format.ts` for display
- Never convert to USD in backend services
- All API responses return BigInt-compatible strings
- Frontend formats values with appropriate decimals based on quote token

### Components Structure ✅ **IMPLEMENTED**
```
src/app/position/uniswapv3/[chain]/[nft]/
├── page.tsx                    // Main page with tab routing ✅
└── components/
    ├── position-header.tsx     // Header with basic info ✅
    ├── overview-tab.tsx        // Overview tab content (placeholder) ✅
    ├── events-tab.tsx          // Events history tab (placeholder) ✅
    ├── position-tabs.tsx       // Tab navigation ✅
    ├── value-pnl-card.tsx      // Value and PnL display (TODO)
    ├── range-status-card.tsx   // Range information (TODO)
    ├── pool-state-card.tsx     // Pool statistics (TODO)
    ├── composition-card.tsx    // Token composition (TODO)
    └── quick-actions.tsx       // Action buttons (TODO)

src/components/positions/details/ (TODO: Create shared components)
├── position-detail-skeleton.tsx  // Loading skeleton
├── data-quality-badge.tsx       // Data source indicator
├── event-card.tsx               // Individual event display
├── event-timeline.tsx           // Visual timeline
└── position-charts/
    ├── pnl-chart.tsx            // Full PnL visualization
    ├── range-chart.tsx          // Range visualization
    └── composition-chart.tsx    // Pie chart for tokens
```

### Chain Configuration ✅ **IMPLEMENTED**
- Enhanced `ChainConfig` with `slug` property
- Chain validation functions: `isValidChainSlug()`, `getChainConfigBySlug()`
- Supported chains: ethereum, arbitrum, base

### State Management
- Use React Query for server state (position data, events, pool stats)
- Zustand for client state (selected tab, filters, UI preferences)
- Real-time updates via polling or WebSocket

### Internationalization ✅ **PARTIALLY IMPLEMENTED**
- Added 25+ new translation keys for position details structure ✅
- Header translations (EN/DE) ✅
- Tab navigation translations (EN/DE) ✅  
- Status and action translations (EN/DE) ✅
- TODO: Event-specific translations
- TODO: Support for number formatting based on locale
- TODO: Tooltips and help text translations

## Implementation Priority

### ✅ **Phase 0 Complete: Infrastructure & Navigation**
- Route structure with new URL schema (`/position/uniswapv3/[chain]/[nft]`) ✅
- Position header with chain and NFT validation ✅
- Tab navigation with URL parameter handling ✅
- Basic internationalization structure ✅
- Position card linking updated to new URLs ✅
- Chain configuration with slug support ✅

### **Next Phases (TODO)**
1. **Phase 1**: Basic overview tab with core metrics (quote token denominated)
   - API endpoints for chain/NFT based data fetching
   - Value & PnL summary card implementation  
   - Range status card
   - Pool state information
   - Position composition display
2. **Phase 2**: Events history tab with timeline
   - Event fetching API integration
   - Event card components
   - Timeline visualization
3. **Phase 3**: Interactive charts and visualizations
4. **Phase 4**: Additional tabs (range, fees)  
5. **Phase 5**: Advanced analytics and risk metrics
6. **Phase 6**: Action buttons integration (add/remove liquidity)

### **URL Structure Benefits Achieved** ✅
- **SEO-friendly URLs**: `/position/uniswapv3/ethereum/12345`
- **Bookmarkable positions**: Direct links to specific NFT positions
- **Chain-aware routing**: Chain validation and explorer links
- **Clean separation**: Position details independent of dashboard
- **NFT-native**: Uses actual Uniswap V3 NFT IDs from blockchain

This plan ensures all values are consistently displayed in quote token amounts, maintaining alignment with the DUNCAN risk framework where all calculations are based on quote asset units.