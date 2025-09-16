# DUNCAN - Uniswap V3 Liquidity Risk Management Platform

## Project Vision

DUNCAN is an innovative DeFi risk management tool that helps users understand and manage risks when providing liquidity in Uniswap V3 pools. The platform focuses on **position planning, risk visualization, and hedging strategies** through integrated Hyperliquid short positions.

## Core Philosophy & Risk Framework

### Base/Quote Asset Terminology

**Strict terminology consistency across all trading pairs:**
- **Base Asset:** The asset whose price movement we track (usually more volatile)
- **Quote Asset:** The asset in which prices are expressed (reference value)

Examples:
- ETH/USDC: Base=ETH, Quote=USDC → "ETH price in USDC"
- WBTC/WETH: Base=WBTC, Quote=WETH → "WBTC price in WETH"
- LINK/USDC: Base=LINK, Quote=USDC → "LINK price in USDC"

### Risk Definition

**Risk = Value loss measured in Quote Asset units**

- No external risks (smart contract hacks, wallet loss, etc.)
- Pure focus on position value changes
- For stable quote assets (USDC/USDT) = USD equivalent loss
- For volatile quote assets (ETH) = loss in that specific asset

**Examples:**
- ETH/USDC position with 5000 USDC invested → Risk = loss below 5000 USDC value
- WBTC/WETH position with 10 WETH invested → Risk = loss below 10 WETH value

### Risk/Reward Framework

**Unified measurement in Quote Asset:**
- **Risk:** Potential loss in Quote Asset units
- **Reward:** Potential gain in Quote Asset units  
- **Position Goal:** Maximize Quote Asset value

## The Three-Phase Risk Structure

### Core Concept: Uniswap V3 PnL Curve

The **iconic PnL curve** represents the fundamental asymmetric risk in V3 positions through three distinct phases:

#### Phase 1: Below Range - Linear Downside Risk
- **Exposure:** 100% Base Asset (e.g., ETH)
- **Risk:** Fully exposed to base asset price decline
- **Curve Shape:** Linear downward slope (1:1 with base asset price)

#### Phase 2: In Range - Concentrated Liquidity Risk  
- **Exposure:** Mixed (rebalancing between Base/Quote)
- **Risk:** Impermanent Loss through constant rebalancing
- **Curve Shape:** Increasingly flat slope (diminishing returns)

#### Phase 3: Above Range - Capped Upside
- **Exposure:** 100% Quote Asset (e.g., USDC)
- **Risk:** Missing upside gains from base asset appreciation
- **Curve Shape:** Flat plateau (no further gains)

### Key Insight: Asymmetric Risk

**"You trade unlimited downside risk for limited upside potential"**

This asymmetry is what most LP providers don't understand. The visualization makes it immediately clear:
- **Red Zone (left):** Linear losses with base asset decline
- **Green Zone (center):** Fee collection with IL costs - the "optimal range"
- **Yellow Zone (right):** Missed gains from base asset pumps


**UI/UX Principles:**
- Dark theme as primary design language
- Informal German localization using "Ihr/eure" form (not formal "Sie") for community feel - "Plant und analysiert eure Positionen" style
- Conditional wallet connection (connect-to-use pattern)
- Hydration-safe rendering to prevent SSR mismatches
- Glassmorphism cards with backdrop-blur effects

**API Security & Authentication:**
- **All API routes require authentication** except `/api/auth/*` (registration, login)
- **NextAuth middleware** (`src/middleware.ts`) automatically protects API endpoints
- **Session-based authentication** using `getSession()` in route handlers
- **Consistent 401 responses** with "Unauthorized - Please sign in" messages
- **Comprehensive test coverage** including auth integration tests
- **Public routes:** `/api/auth/register`, `/api/auth/[...nextauth]`
- **Protected routes:** `/api/tokens/*`, `/api/positions/*`, all other APIs

**Code Conventions:**
- TypeScript strict mode enabled
- Zustand stores with devtools and persistence
- Component-based architecture with clear separation of concerns
- Translation keys organized by feature area
- Comprehensive error handling for Web3 interactions
- Consistent use of BigInt values or corresponding string representation throuhout all layers - database, services, API
- Convert BigInt to human readable formats only when displaying values to the user
- Never use float values for storing token amounts, token prices, position values, pnl, historical values with respect to tokens
- Use English only for documentation and comments
- **NEVER use console.log, console.warn, console.error, or any console methods in backend services and API code** - backend code should operate silently


**Precision & BigInt Handling Rule:**
- **Always store token amounts, prices, and position values as whole numbers in smallest unit**
- **Use BigInt where possible, String representation where BigInt is not supported**
- **API responses must return BigInt-compatible strings, never decimal/float values**
- **Only convert to decimal/human-readable format at display time in frontend/UI layer**
- **Maintain BigInt consistency through all layers: Database → Services → APIs → Frontend**
- Examples:
  - Store USDC amounts as "1234567" (6 decimals) not "1.234567"
  - Store WETH amounts as "1000000000000000000" (18 decimals) not "1.0"
  - Store position values in quote token smallest unit: "69153795098" not "69153.795098"
  - API responses: `{"initialValue": "69153795098", "currentValue": "69153795098", "pnl": "0"}`
  - Database fields remain String type but contain BigInt-compatible values
  - Frontend: Use `formatFractionHuman()` from `src/lib/utils/fraction-format.ts` for display formatting
- **Service Layer Rules:**
  - All calculations use BigInt math, no parseFloat() conversions
  - Services return BigInt strings to APIs
  - APIs pass through BigInt strings without conversion
- **Rationale:** Prevents precision loss, maintains compatibility with smart contract values, enables exact BigInt calculations throughout entire system


**Script Organization:**
- **Always place debug, test, and verification scripts under `scripts/debug/` directory, never in project root**
- Keep project root clean with only configuration files
- Use `scripts/` for essential operational scripts (like api-debug.ts)
- Examples: `scripts/debug/debug-*.ts`, `scripts/debug/test-*.ts`, `scripts/debug/verify-*.ts`

**EVM Chain Configuration:**
- **Always use centralized chain configuration from `src/config/chains.ts`**
- Import `getChainConfig()`, `SUPPORTED_CHAINS`, and `SupportedChainsType` from `@/config/chains`
- Never hardcode chain configurations, RPC URLs, or chain IDs in services
- Use `getChainConfig(chainName)` to get chain configuration including RPC URLs
- This ensures consistent chain configuration across all services and prevents environment variable issues

**Database Seeding:**
- **Development database automatically seeds test user** via `prisma/seed.ts`
- **Production database never gets seeded** - environment check prevents seeding
- **Test credentials (development only)**: test@testmann.kk / test123456 / "Test Testmann"
- **Seeding commands**: `npm run db:seed` or automatic via `prisma migrate reset/dev`
- **Environment safety**: Only seeds when `NODE_ENV !== 'production'`

**Script Output Standards:**
- **All scripts in `scripts/` directory must output JSON-only structures**
- **Success responses**: Return structured JSON with relevant data
- **Error responses**: Return `{"error": "error message"}` object
- **No console.log, console.error, console.warn, or any console methods**
- **No emojis, fancy formatting, progress messages, or status updates**
- **All output must be valid JSON parseable by automation tools**
- **Examples:**
  - Success: `{"poolAddress": "0x...", "blockNumber": "12345", "price": "..."}`
  - Error: `{"error": "Invalid pool address format"}`
- **Exception**: Help messages (--help flag) may use console.error for usage instructions

**Additional Coding Guidelines for Claude:**
- use formatFractionHuman() or other functions from fraction-formats.ts when displaying bigint values
- use scripts/api-debug.ts when testing API behaviour because it contains proper authentication