# 🧩 Uniswap V3 Event Worker Algorithm

A resilient, chain-agnostic background process for monitoring Uniswap V3 **IncreaseLiquidity**, **DecreaseLiquidity**, and **Collect** events from the **NonfungiblePositionManager (NFPM)** contract.  
It supports **reorg detection**, **catch-up on startup**, and **idempotent event ingestion**.

---

## 🏗 Data Model (Persistent State)

| Store | Purpose | Key Fields |
|-------|----------|------------|
| **HeaderStore** | Tracks recent block headers for reorg detection | `number`, `hash`, `parentHash`, `timestamp` |
| **EventStore** | Canonicalized events for PnL & ledger projection | `positionId`, `blockNumber`, `transactionIndex`, `logIndex`, `txHash`, `eventType`, `args` |
| **Watermark** | Highest *fully processed* block number | `lastProcessedHeight` |
| **ChainConfig** | Chain-specific parameters | `confirmationsFallback`, `supportsFinalized`, `supportsSafe` |

---

## 🧠 Core Concepts

- **Boundary block:**  
  Determined dynamically using the best available finality level:

finalized.number → safe.number → latest.number - confirmationsFallback


- **Idempotency:**  
Each event is uniquely identified by `(blockNumber, txHash, logIndex)` and processed only once.

- **Sliding window:**  
Only headers newer than `boundary` are retained for reorg detection.

---

## ⚙️ Helper Functions

- **Boundary()** → returns current safe/finalized boundary height.  
- **Prune(boundary)** → delete headers ≤ boundary.  
- **DetectReorg(boundary)** → compare stored hashes vs canonical ones, return earliest mismatch if found.  
- **Rollback(fromHeightExclusive)** → delete headers & events above given height, reset watermark.  

---

## 🏁 Startup Sequence

1. **Provider probe:** detect if `blockTag = 'finalized'` or `'safe'` is supported.  
2. **Boundary = Boundary()**  
3. **Prune(boundary)**  
4. **Catch-up:**
 - Read stored `watermark` (if null → set to `earliest.number - 1`).
 - Query `latest` block.
 - For all heights `h = watermark + 1 … latest`: call `ProcessBlock(h)`.
 - Update `watermark = latest.number`.
5. **Reorg check:** run `DetectReorg(boundary)`.  
 - If mismatch → `Rollback(commonAncestor)` → reprocess from there.

---

## 🔁 Main Loop (Polling or WebSocket)

Repeat every `T` seconds or on new head event:

1. `boundary = Boundary()`
2. `Prune(boundary)`
3. `DetectReorg(boundary)`
 - No reorg → continue.
 - Reorg → `Rollback(commonAncestor)` → replay from ancestor + 1.
4. `latest = getBlock('latest')`
5. For each block `h = watermark + 1 … latest.number` → `ProcessBlock(h)`
6. Set `watermark = latest.number`

> Optionally limit per-tick processing (e.g. 50 blocks per cycle).

---

## 🧩 ProcessBlock(h)

1. **Fetch block header:** store `number`, `hash`, `parentHash`, `timestamp`.  
2. **Fetch logs:**  

getLogs({ fromBlock:h, toBlock:h, address: NFPM, topics: [Increase, Decrease, Collect] })

3. **Parse and persist:**  
- Extract `eventType`, `args`, `txHash`, `transactionIndex`, `logIndex`.
- Upsert into `EventStore` (idempotent via unique key).
4. **(Optional) Domain logic:**  
- `IncreaseLiquidity`: L↑  
- `DecreaseLiquidity`: L↓, realize market PnL, record principal owed.  
- `Collect`:  
  - Normal case: fees.  
  - Special case (`liquidity == 0`): split payout into principal return + remaining fees.
5. **Update watermark = h** after successful processing.

---

## 🔄 Reorg Recovery

When `DetectReorg` finds a mismatch:

1. Determine **common ancestor** via stored headers and `parentHash` chain.  
2. **Rollback(commonAncestor):**  
- Delete events and headers where `blockNumber > commonAncestor`.  
- Reset `watermark = commonAncestor`.  
- Restore or rebuild derived state from blocks ≤ ancestor.  
3. **Replay:** process blocks `commonAncestor + 1 … latest`.

---

## 📚 Ordering & Edge Cases

- **Canonical order:**  
`ORDER BY blockNumber, transactionIndex, logIndex`
- **Manual ledger events:**  
Use `transactionIndex = -1`, `logIndex < 0` to appear before on-chain events.
- **Special Collect case:**  
`Collect` + `liquidity == 0` → payout includes principal return + possible residual fees.
- **Idempotency:**  
Upserts using `(blockNumber, txHash, logIndex)` ensure consistent processing.

---

## 🛡️ Robustness & Operations

- **Retry & backoff:** exponential on RPC errors.  
- **Batching:** process multiple blocks sequentially; optional parallel fetch with ordered commit.  
- **Monitoring:**  
- Metrics: processed blocks, reorg depth, replay duration, RPC error rate.  
- Alerts: reorg depth > threshold, repeated rollbacks.  
- **Chain configuration:** per-chain settings for `confirmationsFallback`, NFPM address, topics, and finality support.

---

## ✅ Outcome

A fully deterministic, **reorg-resistant**, and **idempotent** worker that:

- Catches up missing blocks on startup.  
- Monitors the NFPM contract for liquidity/collect events.  
- Detects and recovers from forks.  
- Maintains consistent ordering for PnL and ledger projection.
