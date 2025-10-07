# Midcurve - Uniswap V3 Liquidity Risk Management Platform

<div align="center">

![Midcurve Logo](https://img.shields.io/badge/Midcurve-Risk%20Management-blue?style=for-the-badge)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Wagmi](https://img.shields.io/badge/Wagmi-2.16-646cff?style=flat)](https://wagmi.sh/)

**Comprehensive DeFi risk management for Uniswap V3 liquidity providers**

[Features](#features) • [Philosophy](#philosophy) • [Quick Start](#quick-start) • [Documentation](#documentation)

</div>

## Overview

Midcurve is an innovative DeFi risk management platform that helps users understand and manage risks when providing liquidity in Uniswap V3 pools. The platform focuses on **position planning, risk visualization, and hedging strategies** through advanced analytics and integrated risk management tools.

### 🎯 Key Features

- **📊 Interactive PnL Visualization** - Real-time profit/loss curves showing the three-phase risk structure
- **🎚️ Advanced Range Management** - Dynamic range selectors with preset configurations
- **📈 APR Projections** - Historical and projected Annual Percentage Rate calculations
- **💰 Position Planning** - Comprehensive tools for liquidity position configuration
- **🔗 Multi-Chain Support** - Ethereum, Arbitrum, and Base networks
- **🛡️ Risk Analytics** - Deep insights into impermanent loss and concentration risk
- **📱 Responsive Design** - Modern, mobile-first interface with dark theme

## Risk Management Philosophy

### The Three-Phase Risk Structure

Midcurve's core philosophy centers around understanding Uniswap V3's **asymmetric risk profile** through three distinct phases:

#### 🔴 Phase 1: Below Range - Linear Downside Risk
- **Exposure:** 100% Base Asset (e.g., ETH)
- **Risk:** Fully exposed to base asset price decline
- **Curve Shape:** Linear downward slope (1:1 with base asset price)

#### 🟡 Phase 2: In Range - Concentrated Liquidity Risk
- **Exposure:** Mixed (rebalancing between Base/Quote)
- **Risk:** Impermanent Loss through constant rebalancing
- **Curve Shape:** Increasingly flat slope (diminishing returns)

#### 🟢 Phase 3: Above Range - Capped Upside
- **Exposure:** 100% Quote Asset (e.g., USDC)
- **Risk:** Missing upside gains from base asset appreciation
- **Curve Shape:** Flat plateau (no further gains)

### Key Insight: Asymmetric Risk

> **"You trade unlimited downside risk for limited upside potential"**

This asymmetry is what most LP providers don't understand. Midcurve's visualization makes it immediately clear:
- **Red Zone (left):** Linear losses with base asset decline
- **Green Zone (center):** Fee collection with IL costs - the "optimal range"
- **Yellow Zone (right):** Missed gains from base asset pumps

### Risk Definition Framework

**Risk = Value loss measured in Quote Asset units**

- **Unified Measurement:** All risks measured in Quote Asset terms
- **Pure Focus:** Position value changes only (no external risks)
- **Clear Examples:**
  - ETH/USDC position with 5000 USDC → Risk = loss below 5000 USDC value
  - WBTC/WETH position with 10 WETH → Risk = loss below 10 WETH value

## Technology Stack

### Frontend
- **Framework:** Next.js 15.5 with App Router
- **Language:** TypeScript with strict mode
- **Styling:** Tailwind CSS 4.0 with glassmorphism design
- **State Management:** Zustand with persistence
- **Charts:** Recharts for data visualization
- **Web3:** Wagmi 2.16 + RainbowKit for wallet connections

### Backend
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js with session-based auth
- **APIs:** RESTful APIs with comprehensive error handling
- **Blockchain:** Viem for Ethereum interactions
- **External APIs:** The Graph subgraphs, Alchemy Token API

### Infrastructure
- **Deployment:** Vercel-optimized
- **Development:** Docker Compose for local blockchain + PostgreSQL
- **Local Blockchain:** Arbitrum fork with pre-funded test accounts
- **Testing:** Vitest with React Testing Library
- **Linting:** ESLint with custom configuration

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** database
- **WalletConnect** Project ID
- **Alchemy** API key (optional, for enhanced token metadata)

### 1. Clone and Install

```bash
git clone https://github.com/your-username/midcurve-ui.git
cd midcurve-ui
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/midcurve_db"

# WalletConnect Project ID (required)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-nextauth-secret-key

# Optional: Enhanced APIs
ALCHEMY_TOKEN_API_KEY=your_alchemy_api_key
THE_GRAPH_API_KEY=your_the_graph_api_key
```

### 3. Database Setup

```bash
# Run database migrations
npx prisma migrate dev

# Seed with test data (development only)
npm run db:seed
```

### 4. Docker Development Environment (Optional)

For a complete local development setup with blockchain and database:

```bash
# Start PostgreSQL and Arbitrum fork containers
docker-compose up -d

# This starts:
# - PostgreSQL database on port 5432
# - Local Arbitrum fork on port 8545 (chain ID: 31337)
```

#### Pre-funded Test Wallet

The local Arbitrum fork automatically funds a test wallet with WETH and USDC for testing:

```
Mnemonic:          test test test test test test test test test test test junk
Derivation path:   m/44'/60'/0'/0/
Address:           0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

**Setup in MetaMask/Rabby:**
1. Import the mnemonic phrase above
2. Add custom network:
   - **Network Name:** Arbitrum Fork (Local)
   - **RPC URL:** http://localhost:8545
   - **Chain ID:** 31337
   - **Currency Symbol:** ETH

The wallet will have pre-funded WETH and USDC tokens for testing Uniswap V3 positions.

### 5. Development Server

```bash
# Start development server
npm run dev

# Or with pretty logging
npm run dev:pretty
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

### 6. Production Build

```bash
# Type checking
npm run typecheck

# Run tests
npm run test

# Build for production
npm run build

# Start production server
npm run start
```

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run dev:pretty   # Development with pretty logs
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
npm run test         # Run tests
npm run test:ui      # Tests with UI
npm run test:coverage # Test coverage report
npm run db:seed      # Seed database
```

### Project Structure

```
midcurve-ui/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Dashboard pages
│   │   └── position/          # Position detail pages
│   ├── components/            # React components
│   │   ├── charts/           # Data visualization components
│   │   ├── common/           # Reusable UI components
│   │   └── positions/        # Position-specific components
│   ├── hooks/                # Custom React hooks
│   │   ├── api/              # API query hooks
│   │   └── web3/             # Web3 interaction hooks
│   ├── lib/                  # Utility libraries
│   │   ├── api/              # API utilities
│   │   ├── utils/            # General utilities
│   │   └── web3/             # Web3 utilities
│   ├── services/             # Business logic services
│   ├── store/                # Zustand state stores
│   └── types/                # TypeScript type definitions
├── prisma/                   # Database schema and migrations
├── public/                   # Static assets
└── docs/                     # Documentation
```

### Code Conventions

- **TypeScript strict mode** with comprehensive type safety
- **Component-based architecture** with clear separation of concerns
- **BigInt precision** for all token amounts and calculations
- **EVM address normalization** using centralized utilities
- **Structured logging** with request correlation
- **API service layer** with consistent error handling

## Contributing

1. **Fork the repository**
2. **Create your feature branch** (`git checkout -b feature/amazing-feature`)
3. **Follow code conventions** and run tests
4. **Commit your changes** (`git commit -m 'feat: add amazing feature'`)
5. **Push to the branch** (`git push origin feature/amazing-feature`)
6. **Open a Pull Request**

### Development Guidelines

- Use **semantic commit messages** (feat:, fix:, docs:, etc.)
- Ensure **all tests pass** and maintain coverage
- Follow **TypeScript strict mode** requirements
- Implement **proper error handling** and logging
- Update **documentation** for new features

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for the DeFi community**

[⭐ Star this repository](https://github.com/your-username/midcurve-ui) if you find it helpful!

</div>
