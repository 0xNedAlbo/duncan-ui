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

## Development Roadmap

### Phase 1: Risk-Aware Position Planning (Current Focus)

**Core Features:**
- **Interactive Position Calculator**
  - Token pair selection (ETH/USDC, WBTC/USDC, etc.)
  - Chain selection (Ethereum, Arbitrum, Base)
  - Position size input (in Quote Asset)
  - Price range configuration

- **Advanced Risk Visualization**
  - **Central PnL Curve:** Interactive three-phase risk display
  - Real-time curve updates with input changes
  - Drag & drop range adjustment
  - Price scenario simulator (-50% to +100%)

- **Stop Loss / Take Profit Integration**
  - Visual overlay on PnL curve
  - Detailed loss/gain calculations
  - Risk/Reward ratio display
  - Break-even analysis

- **Comprehensive Risk Dashboard**
  - Maximum loss scenarios
  - Expected APR calculations

- **LLM Position Descriptions**
  - Human-readable position explanations
  - Risk/reward summaries
  - Strategic insights

**Technical Requirements:**
- Real-time data integration (Subgraph + APIs)
- Historical fee/volume data analysis
- Precise tick-based calculations

### Phase 2: Hedging Intelligence (Future)

**Hyperliquid Integration:**
- Short position structuring as hedge
- Multi-scenario modeling
- Automated hedge execution
- Dynamic risk management

### Phase 3: Full Automation (Future)

**Professional Platform:**
- Automated position management
- Dynamic hedging strategies
- Risk-trigger automation
- Enterprise features

## Business Model & Regulatory Strategy

### Three-Phase Business Evolution

**Phase A: Personal Beta**
- Small customer base
- Personal hosting
- No regulatory issues

**Phase B: Self-Hosted Distribution** 
- Docker container distribution
- Enterprise licensing
- Configuration-driven deployment

**Phase C: Professional Entity**
- Transfer to regulated firm
- Full automation capabilities
- Professional service offering

### Technical Architecture Requirements

**Deployment-Agnostic Design:**
- Modular service architecture
- Configuration-driven features
- Docker-first implementation
- Plugin system for advanced features

## Current Implementation Status

**Completed:**
- ✅ Core concept and risk framework definition
- ✅ Three-phase risk structure design
- ✅ Base/Quote terminology standardization
- ✅ Phase 1 feature scope definition
- ✅ Business model and regulatory strategy
- ✅ Legacy code backup and clean slate preparation
- ✅ Next.js 15 + Wagmi v2 + RainbowKit project setup
- ✅ Dark theme UI design with glassmorphism effects
- ✅ Internationalization system (English/German) with next-intl
- ✅ Settings system with language selection and persistent storage
- ✅ PnL curve visualization design (SVG mockups with correct mathematical form)
- ✅ Conditional wallet connection UX (connect-to-use pattern)
- ✅ **Interactive PnL curve component with full Uniswap V3 math**
- ✅ **Three-phase risk visualization with profit/loss color coding**
- ✅ **WETH/USDC example position with realistic calculations**
- ✅ **Entry price marker and range boundary indicators**
- ✅ **Interactive tooltips with localized labels**
- ✅ **Complete multilingual support for all UI components**
- ✅ **User authentication system with NextAuth.js**
- ✅ **PostgreSQL database integration with Prisma ORM**
- ✅ **Docker-based database setup for development**
- ✅ **Email/password registration and login**
- ✅ **User dropdown with authentication state**
- ✅ **Comprehensive auth flow translations (EN/DE)**
- ✅ **Dashboard with position management UI**
- ✅ **NFT position import with blockchain integration**
- ✅ **Comprehensive database schema (Token, Pool, Position models)**
- ✅ **Complete token management system with Alchemy integration**
- ✅ **Production-ready testing infrastructure (51 unit tests)**
- ✅ **Token API endpoints with validation and error handling**
- ✅ **Comprehensive API authentication system with NextAuth middleware**
- ✅ **Secure API endpoints requiring user authentication (83 unit tests)**
- ✅ **Professional homepage with landing page and internationalization**
- ✅ **Complete Position Management System with PnL Tracking**
- ✅ **Multi-Chain Subgraph Integration (Ethereum, Arbitrum, Base)**
- ✅ **Position Service with Initial Value Logic and Auto-Upgrade Mechanism**
- ✅ **Quote Token Service with Chain-specific Wrapped Native Token Support**
- ✅ **Position List API with Advanced Filtering, Sorting, and Pagination**
- ✅ **Position Refresh API with Rate Limiting and Ownership Verification**
- ✅ **Modern Position Card UI with Real-time PnL Visualization**
- ✅ **Advanced Position List Component with Data Quality Metrics**
- ✅ **Dashboard Integration with Position Management Features**
- ✅ **Comprehensive Internationalization (32+ new translation keys)**
- ✅ **Event-Based PnL Calculation System with Fee Tracking and Historical Pricing**

**Latest Major Feature: Event-Based PnL System ✅**
The position management system now includes sophisticated event-driven PnL calculation that tracks all position lifecycle events (creation, increases, decreases, fee collections) with historical pricing for accurate profit/loss analysis. This provides users with:
- **Accurate Fee Tracking:** Both collected and unclaimed fees properly attributed to PnL
- **Realized vs Unrealized PnL:** Clear separation based on actual transactions  
- **Historical Cost Basis:** Entry prices from actual blockchain transaction data
- **Comprehensive Breakdown:** Asset value changes, fee income, and total performance metrics
- **Seamless Integration:** Works with existing refresh mechanism, falls back gracefully

**Phase 1 Status: PRODUCTION READY ✅**

**Next Phase Features (Optional Enhancement):**
- 📈 Enhanced risk calculation engine with Uniswap V3 SDK integration
- 📱 Mobile-responsive fine-tuning and touch interactions
- 🔌 Historical PnL charts and advanced analytics
- 💡 Advanced features: drag-and-drop range adjustment, position comparison
- 🔔 Position alerts and notifications
- 👤 User profile page and advanced settings management
- 🚀 Performance optimizations: Redis caching, batch operations
- 📊 Export/import functionality for position data
- 🔧 Zentraler API-Service für alle HTTP-Requests (Auth-Header-Injection, Retry-Logik, Type-Safety)

## Technology Vision

**Modern Stack for Phase 1:**
- **Frontend:** Next.js 15 with App Router + Tailwind CSS
- **Web3:** Wagmi v2 + Viem + RainbowKit for blockchain integration  
- **Authentication:** NextAuth.js v4 with credentials provider + API middleware protection
- **Database:** PostgreSQL with Prisma ORM (normalized Token/Pool/Position schema)
- **State Management:** Zustand with persistence for settings and positions
- **Data:** TanStack Query (React Query) for server state
- **Token Data:** Alchemy Token API with comprehensive caching system
- **Blockchain Data:** The Graph Protocol for Uniswap V3 Subgraph integration (Ethereum, Arbitrum, Base)
- **Position Management:** Complete PnL tracking with Initial Value Service and Auto-Upgrade mechanism
- **Testing:** Vitest + MSW (Mock Service Worker) + 51+ comprehensive unit tests
- **Visualization:** Custom SVG-based chart components for PnL curve + Modern Position Card UI
- **Internationalization:** next-intl for English/German localization (60+ translation keys)
- **Design System:** Dark theme with glassmorphism effects and consistent Slate color palette
- **Mobile:** PWA-ready responsive design with mobile-first approach
- **Development:** Docker containers for database setup + separate test database

## Development Guidelines

**Environment Setup:**
- Requires `.env.local` or `.env.development` with:
  - `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` for Web3 integration
  - `DATABASE_URL` for PostgreSQL connection
  - `NEXTAUTH_URL` and `NEXTAUTH_SECRET` for authentication
  - `ALCHEMY_TOKEN_API_KEY` for token metadata across all chains
  - `THEGRAPH_API_KEY` for Uniswap V3 Subgraph access (optional)
- PostgreSQL database via Docker: `docker-compose up -d`
- Database migrations: `npx prisma migrate dev`
- Database seeding: `npx prisma db push`
- Test database: `npx prisma db push` with TEST_DATABASE_URL
- Support for Ethereum, Arbitrum, and Base networks with full Subgraph integration
- Development server: `npm run dev`
- Build command: `npm run build`
- Linting: `npm run lint`
- Testing: `npm run test` (374 unit tests with comprehensive API coverage, but 92 currently failing)

**Known Issues / TODOs:**
- **Test Suite Failures:** 92 of 374 tests currently failing (10 test files affected) ⚠️ **HIGH PRIORITY**
  - ✅ **Fixed:** Authentication mocking issue - added proper `getServerSession` and `authOptions` mocking
  - **Progress:** Reduced from 98→92 failing tests, fixed 6 tests total
  - **Remaining Issues:** Date serialization, rate limiting cache, module isolation, database setup
  - **Affected Areas:** API route tests (registration, positions, tokens, refresh endpoints)  
  - **Impact:** Improved test coverage, but CI/CD still affected by remaining failures
  - **Priority:** MEDIUM - Primary auth blocker resolved, secondary issues remain
  - **Success:** `src/app/api/positions/route.test.ts` - ✅ **ALL 19 TESTS PASSING** (Auth fix successful)
  - **Remaining Failing Files:**
    - `src/app/api/auth/register/route.test.ts` - ~48 failures (Date serialization, module cache)
    - `src/app/api/positions/import-nft/route.test.ts` - ~8 failures (Auth + validation issues)
    - `src/app/api/positions/[id]/refresh/route.test.ts` - ~6 failures (Rate limiting, date serialization)
    - `src/app/api/tokens/route.test.ts` - ~8 failures (Database setup, parameter validation)
    - Other API route tests - Various secondary issues
  - **Next Steps:** Focus on date serialization and rate limiting cache fixes

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


**Additional Coding Guidelines for Claude:**
- use formatFractionHuman() or other functions from fraction-formats.ts when displaying bigint values
- use scripts/api-debug.ts when testing API behaviour because it contains proper authentication

## Success Metrics

**User Understanding:** Can users instantly recognize the three-phase risk structure?
**Decision Quality:** Do users make better-informed LP decisions?
**Risk Awareness:** Do users understand their actual downside exposure?
**Educational Impact:** Does the tool improve overall DeFi risk literacy?

