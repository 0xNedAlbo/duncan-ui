# Blockscanner Worker

A production-ready blockchain event scanner for Uniswap V3 NonfungiblePositionManager contracts. Implements a reorg-resistant event ledger with automatic rollback and replay capabilities.

## Overview

The blockscanner worker monitors Uniswap V3 position events across multiple chains and maintains a canonical event ledger in the database. It implements the sync algorithm specified in [`sync-algo.md`](./sync-algo.md).

### Key Features

- **Reorg Protection**: Detects and recovers from blockchain reorganizations
- **Multi-Chain Support**: Ethereum, Arbitrum, and Base (configurable)
- **Dynamic Finality**: Uses `finalized` → `safe` → `latest-N` block tags based on chain support
- **Event Scanning**: Tracks `IncreaseLiquidity`, `DecreaseLiquidity`, and `Collect` events
- **Graceful Shutdown**: Persists watermarks and cleanly stops scanning
- **Idempotent Processing**: Events are uniquely identified and processed only once

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Blockscanner Worker                      │
├─────────────────────────────────────────────────────────────┤
│  index.ts        Main entry point, multi-chain coordinator │
│  scanner.ts      BlockScanner class (startup + main loop)  │
│  config.ts       Chain-specific configurations             │
│  types.ts        TypeScript type definitions               │
├─────────────────────────────────────────────────────────────┤
│  boundary.ts     Finality detection (finalized/safe/latest)│
│  reorg.ts        Reorg detection & rollback logic          │
│  processor.ts    Block processing & event parsing          │
├─────────────────────────────────────────────────────────────┤
│  db/headers.ts   BlockScannerHeader database operations    │
│  db/watermarks.ts Watermark management                     │
│  db/events.ts    Event storage (stub for future use)       │
└─────────────────────────────────────────────────────────────┘
```

## Sync Algorithm

The blockscanner implements a robust, reorg-resistant event scanning algorithm with the following components:

### Data Model

The worker maintains three persistent stores:

| Store | Purpose | Key Fields |
|-------|----------|------------|
| **BlockScannerHeader** | Tracks recent block headers for reorg detection | `chain`, `blockNumber`, `hash`, `parentHash`, `timestamp` |
| **BlockScannerWatermark** | Highest fully processed block per chain | `chain`, `lastProcessedHeight` |
| **PositionEvent** | Canonicalized events for PnL & ledger | `positionId`, `blockNumber`, `transactionIndex`, `logIndex`, `txHash`, `eventType` |

### Core Concepts

**Boundary Block:**
Determined dynamically using the best available finality level:
```
finalized.number → safe.number → latest.number - confirmationsFallback
```

**Idempotency:**
Each event is uniquely identified by `(blockNumber, txHash, logIndex)` and processed only once.

**Sliding Window:**
Only headers newer than the boundary are retained for reorg detection.

### Startup Sequence

The worker always starts with a **clean state** - no catch-up processing of old blocks:

1. **Clean State**: Delete all old block headers for this chain
2. **Provider Probe**: Detect if chain supports `finalized` or `safe` block tags
3. **Initialize Watermark**: Set watermark to `current block - 1`

**Why no catch-up?**
- Historical events are handled by the existing position sync mechanism
- Worker only monitors events from "now" forward
- Avoids RPC rate limiting issues during startup
- Faster startup (ready immediately)

### Main Loop

Repeats every `pollIntervalMs` (chain-specific):

1. Calculate `boundary = Boundary()`
2. Prune headers ≤ boundary
3. Detect reorgs by comparing stored headers with canonical chain
   - No reorg → continue
   - Reorg detected → `Rollback(commonAncestor)` → replay from ancestor + 1
4. Get latest block
5. Process blocks from `watermark + 1` to `latest` (max 50 per tick)
6. Update watermark after each successful block

### ProcessBlock(height)

For each block:

1. **Fetch and Store Header**: `number`, `hash`, `parentHash`, `timestamp`
2. **Fetch Event Logs**: Query NFPM contract for IncreaseLiquidity, DecreaseLiquidity, Collect events
3. **Parse Events**: Extract `eventType`, `tokenId`, `liquidity`, `amount0`, `amount1`, `txHash`, `logIndex`
4. **Log Events** (stub): Currently logs events, future will write to `PositionEvent` table
5. **Update Watermark**: Mark block as fully processed

### Reorg Recovery

When `DetectReorg()` finds a hash mismatch:

1. **Find Common Ancestor**: Walk back parent chain via stored headers
2. **Rollback**:
   - Delete headers where `blockNumber > commonAncestor`
   - Delete events where `blockNumber > commonAncestor`
   - Reset watermark to common ancestor
3. **Replay**: Process blocks from `commonAncestor + 1` to `latest`

### Event Ordering

Events are canonically ordered by:
```sql
ORDER BY blockNumber ASC, transactionIndex ASC, logIndex ASC
```

Manual ledger entries use `transactionIndex = -1`, `logIndex < 0` to sort before on-chain events.

### Robustness Features

- **Exponential Backoff**: Automatic retry with backoff on RPC errors (via viem)
- **Batch Limiting**: Max 50 blocks per tick to avoid overwhelming the worker
- **Graceful Shutdown**: Persists watermarks and closes connections on SIGTERM/SIGINT
- **Idempotent Storage**: Events are upserted by unique key to prevent duplicates

For the complete algorithm specification, see [`sync-algo.md`](./sync-algo.md).

## Prerequisites

- **Node.js** 20+ and npm
- **PostgreSQL** database (same as main application)
- **RPC Endpoints** for each chain you want to scan
  - Ethereum: Alchemy, Infura, or QuickNode
  - Arbitrum: Alchemy or Infura
  - Base: Alchemy or Base RPC

## Installation

### 1. Install Dependencies

From the worker directory:

```bash
cd src/workers/blockscanner
npm install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database (required)
DATABASE_URL="postgresql://user:password@localhost:5432/midcurve_db"
DATABASE_URL_UNPOOLED="postgresql://user:password@localhost:5432/midcurve_db"

# RPC Endpoints (required)
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# Scanning Configuration (optional)
# SCAN_CHAINS=ethereum,arbitrum,base

# Logging (optional)
# LOG_LEVEL=info
```

### 3. Database Migration

Run Prisma migration to create the required database tables:

```bash
# From project root
npx prisma migrate dev --name add_blockscanner_models

# Generate Prisma client
npx prisma generate
```

This creates two new tables:
- `blockscanner_headers` - Block headers for reorg detection (sliding window)
- `blockscanner_watermarks` - Scanning progress per chain

**Note:** Headers are automatically cleaned on every startup - the worker always starts from a clean state.

## Development

### Running Locally

Start the worker in development mode with pretty logging:

```bash
npm run dev
```

This will:
1. **Clean state**: Delete all old headers for each chain
2. **Probe finality**: Detect if chains support `finalized`/`safe` tags
3. **Initialize watermarks**: Set each chain to `current block - 1`
4. **Start polling**: Monitor new blocks as they arrive in real-time

**No catch-up processing** - the worker only monitors new blocks from startup time forward.

### Development with Single Chain

To scan only one chain during development:

```bash
SCAN_CHAINS=arbitrum npm run dev
```

### Monitoring Logs

The worker uses structured logging with Pino. Key log events:

- **Startup**: `🚀 Blockscanner worker starting...`
- **Finality Probe**: `Chain supports 'finalized' block tag`
- **Catch-up**: `Starting catch-up` with block count
- **Events**: `📈 IncreaseLiquidity event detected`
- **Reorg**: `⚠️ Reorg detected, rolling back`
- **Heartbeat**: `💓 Blockscanner heartbeat` (every 60s)

### Debugging

Enable debug logging:

```bash
LOG_LEVEL=debug npm run dev
```

Debug logs include:
- Boundary calculation method used
- Block processing details
- Header storage confirmations
- Reorg detection checks

## Production Deployment

### Build for Production

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### Running in Production

```bash
NODE_ENV=production npm start
```

### Docker Deployment

The worker includes a production-ready Dockerfile with multi-stage build.

**Build Docker image:**

```bash
# From project root
docker build -f src/workers/blockscanner/Dockerfile -t blockscanner:latest .
```

**Run Docker container:**

```bash
docker run -d \
  --name blockscanner \
  -e DATABASE_URL="postgresql://..." \
  -e ETHEREUM_RPC_URL="https://..." \
  -e ARBITRUM_RPC_URL="https://..." \
  -e BASE_RPC_URL="https://..." \
  -e LOG_LEVEL=info \
  blockscanner:latest
```

### Fly.io Deployment

The worker is optimized for Fly.io deployment.

**1. Install Fly CLI:**

```bash
curl -L https://fly.io/install.sh | sh
```

**2. Set Secrets:**

```bash
fly secrets set \
  DATABASE_URL="postgresql://..." \
  ETHEREUM_RPC_URL="https://..." \
  ARBITRUM_RPC_URL="https://..." \
  BASE_RPC_URL="https://..."
```

**3. Deploy:**

```bash
# From project root
fly deploy --config src/workers/blockscanner/fly.toml
```

**4. Monitor Logs:**

```bash
fly logs -a midcurve-blockscanner
```

**5. Check Status:**

```bash
fly status -a midcurve-blockscanner
```

## Configuration

### Chain Configuration

Edit `src/config.ts` to adjust chain-specific settings:

```typescript
{
  chain: 'ethereum',
  chainId: 1,
  confirmationsFallback: 12,  // Wait 12 blocks if finalized not available
  supportsFinalized: true,     // Chain supports 'finalized' block tag
  supportsSafe: true,          // Chain supports 'safe' block tag
  pollIntervalMs: 12_000,      // Poll every 12 seconds
}
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `DATABASE_URL_UNPOOLED` | No | - | Direct Prisma connection (bypasses pooling) |
| `ETHEREUM_RPC_URL` | Yes* | - | Ethereum RPC endpoint |
| `ARBITRUM_RPC_URL` | Yes* | - | Arbitrum RPC endpoint |
| `BASE_RPC_URL` | Yes* | - | Base RPC endpoint |
| `SCAN_CHAINS` | No | `ethereum,arbitrum,base` | Chains to scan (comma-separated) |
| `LOG_LEVEL` | No | `info` | Log verbosity (silent, error, warn, info, debug) |
| `NODE_ENV` | No | `development` | Environment (development, production, test) |

*Required if chain is included in `SCAN_CHAINS`

## Operational Considerations

### RPC Rate Limits

- **Ethereum**: Slower block time (~12s), fewer requests needed
- **Arbitrum**: Fast blocks (~250ms), higher request rate
- **Base**: Moderate blocks (~2s), moderate request rate

Use paid RPC plans for production to avoid rate limiting.

### Database Size

The worker stores minimal data:
- **Headers**: Sliding window above boundary (typically 10-100 blocks per chain, cleaned on restart)
- **Watermarks**: One row per chain (reset on restart)
- **Events**: Not stored yet (stub implementation just logs)

**Storage is minimal** because:
- Headers are deleted on every startup (clean state)
- Headers above boundary are pruned during normal operation
- Only recent block headers needed for reorg detection

### Reorg Handling

When a reorg is detected:
1. Worker logs reorg depth and common ancestor
2. Deletes headers and events above common ancestor
3. Resets watermark to common ancestor
4. Replays blocks from common ancestor + 1 to latest

**Typical reorg depths:**
- Ethereum: 1-3 blocks (rare)
- Arbitrum: Not applicable (L2 uses batch submission)
- Base: 1-2 blocks (rare)

### Graceful Shutdown

The worker handles `SIGTERM` and `SIGINT` signals:

```bash
# Graceful shutdown
kill -SIGTERM <pid>

# Or Ctrl+C in terminal
```

On shutdown:
- Stops all active scanners
- Persists watermarks
- Closes database connections
- Exits cleanly

## Troubleshooting

### Worker fails to start

**Check RPC URLs:**
```bash
# Test Ethereum RPC
curl -X POST $ETHEREUM_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**Check database connection:**
```bash
# From project root
npx prisma db push
```

### No events detected

**Verify NFPM address:**
- Check `src/config.ts` has correct NonfungiblePositionManager addresses
- Ethereum/Arbitrum: `0xC36442b4a4522E871399CD717aBDD847Ab11FE88`
- Base: `0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1`

**Check watermark:**
```sql
SELECT * FROM blockscanner_watermarks;
```

### Reorg loop

If worker repeatedly detects reorgs:
- Check RPC provider stability
- Verify `confirmationsFallback` is set high enough
- Consider using `finalized` block tag if available

### High CPU usage

- Reduce `pollIntervalMs` in chain config
- Limit `SCAN_CHAINS` to fewer chains
- Add `maxBlocksPerTick` limit in scanner

## Current Limitations

### Event Storage (Stub)

The worker currently **logs events only** and does not write to the `position_events` table. This will be implemented in a future update.

To see detected events:
```bash
# Watch logs for event detection
npm run dev | grep "event detected"
```

### Position Matching

The worker does not yet match detected events to positions in the database. Events are logged with `tokenId` but not linked to user positions.

## Development Roadmap

- [ ] Implement event storage in `position_events` table
- [ ] Add position matching via `tokenId` lookup
- [ ] Implement PnL calculation on event detection
- [ ] Add metrics/monitoring (Prometheus, Datadog)
- [ ] Add retry logic with exponential backoff
- [ ] Support WebSocket subscriptions (alternative to polling)
- [ ] Add alerting for reorg depth > threshold

## Contributing

When modifying the worker:

1. **Follow the sync algorithm** from `sync-algo.md`
2. **Maintain idempotency** - events should be uniquely identified
3. **Test reorg handling** - simulate with local forks
4. **Update tests** - ensure edge cases are covered
5. **Document changes** - update this README

## License

MIT License - see [LICENSE](../../../LICENSE) file for details.

---

**Built with ❤️ for the DeFi community**
