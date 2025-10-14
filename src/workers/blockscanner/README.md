# Blockscanner Worker

A background service that scans blockchain events for Uniswap V3 position changes with reorg detection and adaptive chunking.

## Overview

The blockscanner worker is an independent process that:
- Monitors multiple EVM chains (Ethereum, Arbitrum, Base) for Uniswap V3 events
- Detects and handles blockchain reorganizations (reorgs)
- Uses adaptive chunking for efficient block scanning
- Maintains a sliding window of recent blocks for reorg detection
- Persists watermarks to resume scanning after restarts

## Architecture

- **Independent Docker container** deployed on Fly.io
- **Shared codebase access** via TypeScript path aliases (`@/services`, `@/lib`, `@/config`)
- **Structured logging** with Pino (JSON in production, pretty-printed in development)
- **Graceful shutdown** handling for SIGTERM/SIGINT signals
- **Database access** through Prisma client (same schema as main application)

## Local Development

### Prerequisites

- Node.js 20+
- npm or pnpm
- PostgreSQL database (same as main app)
- `.env.local` file in project root with required environment variables

### Required Environment Variables

Create or update `.env.local` in the **project root** (not in worker directory):

```bash
# Database connection (same as main app)
DATABASE_URL="postgresql://user:password@localhost:5432/midcurve"
DATABASE_URL_UNPOOLED="postgresql://user:password@localhost:5432/midcurve"

# Chain RPC endpoints
ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
ARBITRUM_RPC_URL="https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY"
BASE_RPC_URL="https://base-mainnet.g.alchemy.com/v2/YOUR_KEY"

# Etherscan API key (used for all chains: Etherscan, Arbiscan, Basescan)
ETHERSCAN_API_KEY="your_etherscan_api_key"

# Optional: Worker configuration
LOG_LEVEL="debug"                    # Default: "info"
POLL_INTERVAL_MS="15000"            # Default: 15000 (15 seconds)
WINDOW_BLOCKS="200"                 # Default: 200 blocks
```

### Install Dependencies

```bash
# From worker directory
cd src/workers/blockscanner
npm install
```

### Generate Prisma Client

```bash
# From project root
npx prisma generate
```

### Run Worker Locally

```bash
# From worker directory
cd src/workers/blockscanner
npm run dev
```

The worker will:
1. Connect to your local PostgreSQL database
2. Initialize or resume from persisted watermarks
3. Start scanning blocks on all configured chains
4. Output pretty-printed logs to console
5. Support hot-reload via `tsx watch`

### Development Commands

```bash
# Run with hot-reload and pretty logs
npm run dev

# Type checking only (no execution)
npm run typecheck

# Build TypeScript to JavaScript
npm run build

# Run compiled version
npm run start
```

### Testing Locally

1. **Monitor logs**: Watch console output for scan progress and events
2. **Check database**: Verify `PositionLedger` table receives new entries
3. **Test reorg handling**: Difficult to test locally without private testnet
4. **Verify graceful shutdown**: Press Ctrl+C and ensure clean exit

## Production Deployment (Fly.io)

### Prerequisites

- Fly.io account and CLI installed (`flyctl` or `fly`)
- Production environment variables ready for deployment

### Create Fly.io App

If the app doesn't exist yet, create it first:

```bash
# Create app in Frankfurt region
fly apps create midcurve-blockscanner --org personal

# Verify app was created
fly apps list | grep blockscanner
```

### Required Fly Secrets

Set secrets before first deployment:

```bash
# Database connections (use production URLs)
fly secrets set DATABASE_URL="postgresql://..." --app midcurve-blockscanner
fly secrets set DATABASE_URL_UNPOOLED="postgresql://..." --app midcurve-blockscanner

# Chain RPC endpoints
fly secrets set ETHEREUM_RPC_URL="https://..." --app midcurve-blockscanner
fly secrets set ARBITRUM_RPC_URL="https://..." --app midcurve-blockscanner
fly secrets set BASE_RPC_URL="https://..." --app midcurve-blockscanner

# Etherscan API key (used for all chains)
fly secrets set ETHERSCAN_API_KEY="..." --app midcurve-blockscanner

# Optional: Override defaults
fly secrets set LOG_LEVEL="info" --app midcurve-blockscanner
fly secrets set POLL_INTERVAL_MS="15000" --app midcurve-blockscanner
```

### Deploy to Fly.io

**IMPORTANT:** Always run deployment from the **project root** directory:

```bash
# Ensure you're in project root
cd /path/to/midcurve-finance

# Deploy worker
fly deploy --config src/workers/blockscanner/fly.toml
```

The deployment will:
1. Build multi-stage Docker image from `src/workers/blockscanner/Dockerfile`
2. Generate Prisma client inside container
3. Deploy to Frankfurt region (`fra`)
4. Run health checks to verify startup
5. Use rolling deployment strategy (zero downtime)

**Note:** The `fly.toml` file references `Dockerfile` as a relative path from its own location (`src/workers/blockscanner/`), but deployment must be initiated from the project root for proper build context.

### Verify Deployment

```bash
# Check app status
fly status --app midcurve-blockscanner

# View live logs
fly logs --app midcurve-blockscanner

# SSH into container
fly ssh console --app midcurve-blockscanner

# Check resource usage
fly vm status --app midcurve-blockscanner
```

### Deployment Configuration

See [fly.toml](./fly.toml) for configuration:
- **App name**: `midcurve-blockscanner`
- **Region**: Frankfurt (`fra`)
- **VM size**: `shared-cpu-1x` with 256MB memory
- **Port**: Internal 8080 (mapped to 80/443)
- **Health checks**: TCP checks every 15s
- **Deployment strategy**: Rolling (zero downtime)

### Monitoring Production

```bash
# Tail logs in real-time
fly logs --app midcurve-blockscanner

# Check app metrics
fly dashboard midcurve-blockscanner

# Restart worker if needed
fly apps restart midcurve-blockscanner

# Scale worker instances
fly scale count 1 --app midcurve-blockscanner

# Update secrets
fly secrets set KEY=value --app midcurve-blockscanner
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | **Required** | PostgreSQL connection URL with pgbouncer |
| `DATABASE_URL_UNPOOLED` | Optional | Direct PostgreSQL URL for Prisma |
| `ETHEREUM_RPC_URL` | **Required** | Ethereum mainnet RPC endpoint |
| `ARBITRUM_RPC_URL` | **Required** | Arbitrum One RPC endpoint |
| `BASE_RPC_URL` | **Required** | Base mainnet RPC endpoint |
| `ETHERSCAN_API_KEY` | **Required** | Etherscan API key (works for all chains) |
| `LOG_LEVEL` | `info` | Pino log level: trace, debug, info, warn, error |
| `POLL_INTERVAL_MS` | `15000` | Milliseconds between scan cycles |
| `WINDOW_BLOCKS` | `200` | Sliding window size for reorg detection |
| `NODE_ENV` | `development` | Environment: development or production |

### Scan Behavior

- **Cold start**: Begins scanning from latest block
- **Resume**: Continues from persisted watermark after restart
- **Reorg detection**: Compares block hashes in sliding window
- **Adaptive chunking**: Adjusts scan range based on chain conditions
- **Boundary pruning**: Removes old blocks beyond finalized/safe boundary

## Troubleshooting

### Worker Not Starting

```bash
# Check logs for errors
fly logs --app midcurve-blockscanner

# Common issues:
# - Missing secrets (DATABASE_URL, RPC URLs)
# - Invalid Prisma schema
# - Database connection timeout
```

### No Events Being Scanned

- Verify RPC endpoints are responding (check logs)
- Confirm Etherscan API keys are valid
- Check watermark position in database: `SELECT * FROM BlockScanWatermark`
- Ensure pools exist in `Pool` table for events to match

### High Memory Usage

- Reduce `WINDOW_BLOCKS` to decrease sliding window size
- Increase `POLL_INTERVAL_MS` to reduce scan frequency
- Check for RPC rate limiting causing retries

### Reorg False Positives

- Increase `WINDOW_BLOCKS` for longer finality window
- Verify RPC endpoint returns consistent block hashes
- Check chain for actual reorg activity

### Local Development Issues

- Ensure `.env.local` exists in **project root** (not worker directory)
- Run `npx prisma generate` from project root before starting worker
- Verify PostgreSQL is running and accessible
- Check Node.js version (requires v20+)

## Architecture Details

### File Structure

```
src/workers/blockscanner/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config.ts             # Configuration loader
│   ├── types.ts              # TypeScript types
│   ├── state/
│   │   ├── watermark.ts      # Persistent scan position
│   │   └── window.ts         # Sliding window management
│   └── sync/
│       ├── forward.ts        # Forward block scanning
│       └── reorg.ts          # Reorg detection & rollback
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── Dockerfile                # Production container
├── fly.toml                  # Fly.io deployment config
├── .dockerignore             # Docker build exclusions
└── README.md                 # This file
```

### Dependencies

**Production:**
- `@prisma/client` - Database ORM
- `pino` - Structured logging

**Development:**
- `tsx` - TypeScript execution with hot-reload
- `pino-pretty` - Pretty log formatting
- `typescript` - TypeScript compiler

### Shared Code Access

The worker imports from main project via path aliases:
- `@/services/*` - Blockchain and database services
- `@/lib/*` - Utility functions
- `@/config/*` - Chain configurations
- `@/types/*` - Shared TypeScript types
- `@prisma/client` - Database client

## Contributing

When modifying the worker:
1. Test changes locally with `npm run dev`
2. Verify TypeScript compilation: `npm run typecheck`
3. Test Docker build: `docker build -f src/workers/blockscanner/Dockerfile .`
4. Deploy to Fly.io: `fly deploy --config src/workers/blockscanner/fly.toml`
5. Monitor production logs for errors

## License

Same as main Midcurve project.
