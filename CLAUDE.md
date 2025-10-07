# Midcurve - Uniswap V3 Liquidity Risk Management Platform

## Project Vision

Midcurve is an innovative DeFi risk management tool that helps users understand and manage risks when providing liquidity in Uniswap V3 pools. The platform focuses on **position planning, risk visualization, and hedging strategies** through integrated Hyperliquid short positions.

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
- Informal German localization using "Du/Deine" form (not formal "Sie") for personal feel - "Plane und analysiere deine Positionen" style
- Conditional wallet connection (connect-to-use pattern)
- Hydration-safe rendering to prevent SSR mismatches
- Glassmorphism cards with backdrop-blur effects

**API Security & Authentication:**
- **All API routes require authentication** except `/api/auth/*` (registration, login) and `/api/health`
- **Dual authentication support**: Session-based authentication AND API key authentication
- **Use `withAuthAndLogging()` wrapper for all protected API routes** - provides both authentication and structured logging
- **Alternative: Use `withAuth()` for auth-only** when logging is not needed
- **Never use `getSession()` or `getAuthUser()` directly in API routes** - always use the wrapper approach
- **Middleware is lightweight** - only handles routing, authentication is handled at API route level
- **Consistent 401 responses** with "Unauthorized - Please sign in" messages
- **Comprehensive test coverage** including auth integration tests
- **Public routes:** `/api/auth/register`, `/api/auth/[...nextauth]`, `/api/health`
- **Protected routes:** `/api/tokens/*`, `/api/positions/*`, all other APIs

**Authentication Wrapper Patterns:**
```typescript
// Recommended: Combined auth + logging
export const GET = withAuthAndLogging<ResponseType>(
  async (request: NextRequest, { user, log }) => {
    log.debug({ userId: user.userId }, 'Processing request');
    // Your logic here
  }
);

// Alternative: Auth only (when logging not needed)
export const GET = withAuth<ResponseType>(
  async (request: NextRequest, { user }) => {
    // Your logic here
  }
);
```

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

**Backend Logging Rules:**
- **Service Layer**: Completely silent - no logging, no console.* outputs, only throw errors when needed
- **API Layer**: Structured logging only through logging framework (Pino)
- **Error Handling**: DEBUG-level logs with full stack traces when services throw errors
- **Request Correlation**: All API logs include request ID for tracing across service calls


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

**EVM Address Handling Rule:**
- **ALWAYS use centralized EVM address utilities from `src/lib/utils/evm.ts` - single source of truth for all address operations**
- **Required functions for all address operations:**
  - `normalizeAddress(address)` - Convert to EIP-55 checksum format for storage/display
  - `isValidAddress(address)` - Validate Ethereum address format
  - `compareAddresses(addressA, addressB)` - Deterministic comparison for sorting
  - `generatePlaceholderSymbol/Name(address)` - Generate display names from addresses
- **Usage patterns:**
  - **Normalization:** Always use `normalizeAddress()` before database storage or external API calls
  - **Validation:** Use `isValidAddress()` for input validation in services
  - **Comparison/Sorting:** Use `compareAddresses()` for deterministic token ordering (Uniswap V3)
  - **Never use direct BigInt(), getAddress(), or custom normalization functions**
- **Examples:**
  ```typescript
  import { normalizeAddress, compareAddresses, isValidAddress } from "@/lib/utils/evm";

  // ✅ Correct - normalize before storage
  const checksumAddress = normalizeAddress(userInput);

  // ✅ Correct - deterministic comparison
  const isToken0First = compareAddresses(tokenA, tokenB) < 0;

  // ✅ Correct - validation
  if (!isValidAddress(address)) throw new Error("Invalid address");

  // ❌ Wrong - direct viem usage
  const addr = getAddress(userInput);

  // ❌ Wrong - direct BigInt comparison
  const isFirst = BigInt(tokenA) < BigInt(tokenB);
  ```
- **EIP-55 is the canonical format** for storing addresses in database and displaying to users
- **Rationale:** Single source of truth prevents inconsistencies, ensures deterministic sorting, maintains EIP-55 compliance, and enables proper checksum validation across entire codebase

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

**ReactQuery Cache Key Standards:**
- **Always use database primary keys in ReactQuery cache keys for data consistency and proper invalidation**
- **For positions**: Use composite primary key `userId_chain_protocol_nftId` pattern
- **Examples:**
  - Position data: `['position', userId, chain, protocol, nftId]`
  - Position ledger: `['position-ledger', userId, chain, protocol, nftId]`
  - Position APR: `['position-apr-periods', userId, chain, protocol, nftId]`
- **Benefits**: Prevents cache collisions, enables proper user data isolation, ensures cache invalidation matches database operations

**API Service Layer Architecture:**
- **APIs NEVER query database or external infrastructure directly** - only through service methods
- **APIs NEVER use human-readable number formats** - always BigInt values scaled to token decimals
- **Input parameters:** Accept BigInt strings (e.g., "1000000" for 1 USDC)
- **Output values:** Return BigInt strings (e.g., "1500000" for 1.5 USDC)
- **Service methods handle all:** Database queries, external API calls, calculations
- **APIs are thin wrappers:** Authentication → Service call → Response formatting
- **Examples:**
  - API receives: `{"amount": "1000000"}` (1 USDC as 1000000 scaled)
  - API calls: `await TokenService.getPrice(tokenAddress, amount)`
  - API returns: `{"price": "1500000"}` (1.5 USDC as 1500000 scaled)

**Git Commit Policy:**
- **NEVER commit changes to git unless explicitly requested by the user**
- **Wait for explicit instruction** before running `git add`, `git commit`, or `git push` commands
- **User must request commits** - do not assume commits should be made after completing tasks
- **Exception:** Only when user uses the `/git-commit` slash command or directly asks to commit changes

**Additional Coding Guidelines for Claude:**
- use formatCompactValue() from fraction-formats.ts when displaying bigint values (not formatFractionHuman which requires Fraction objects)
- use scripts/api-debug.ts when testing API behaviour because it contains proper authentication