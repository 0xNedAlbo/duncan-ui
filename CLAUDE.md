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
  - Historical probability metrics
  - Time-based profitability projections

- **LLM Position Descriptions**
  - Human-readable position explanations
  - Risk/reward summaries
  - Strategic insights

**Technical Requirements:**
- Mobile-first responsive design
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

**Next Steps:**
- 🔄 New project architecture setup
- 📋 Modern tech stack implementation
- 🎨 UI/UX design with focus on PnL curve visualization
- 📊 Core risk calculation engine
- 📱 Mobile-responsive implementation

## Technology Vision

**Modern Stack for Phase 1:**
- **Frontend:** Next.js 14+ with modern UI framework (Shadcn/UI + Tailwind)
- **Web3:** Wagmi v2 + Viem for blockchain integration  
- **State Management:** Zustand for global state
- **Data:** React Query for server state
- **Visualization:** Custom chart components for PnL curve
- **Mobile:** PWA-ready responsive design

## Success Metrics

**User Understanding:** Can users instantly recognize the three-phase risk structure?
**Decision Quality:** Do users make better-informed LP decisions?
**Risk Awareness:** Do users understand their actual downside exposure?
**Educational Impact:** Does the tool improve overall DeFi risk literacy?

---

*This document represents the foundational concept for DUNCAN v1 as developed through collaborative planning sessions. The focus remains on creating an intuitive, educational, and powerful risk management tool for the DeFi community.*