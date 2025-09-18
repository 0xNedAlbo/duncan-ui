# APR Calculation Method for Uniswap V3 Positions

## Overview

This document describes the methodology for calculating the "actual" or "realized" Annual Percentage Return (APR) for Uniswap V3 liquidity positions based on historical position events and fee collections. The calculation uses a time-weighted cost basis approach to fairly distribute collected fees across periods where capital was actively deployed.

## Core Concept

Traditional APR calculations often use simple averages or point-in-time snapshots that don't accurately reflect the varying amounts of capital deployed over time. Our approach:

1. **Time-Weighted Cost Basis**: Account for when and how much capital was deployed
2. **Proportional Fee Distribution**: Distribute collected fees across active capital periods
3. **Period-Based APR**: Calculate APR contributions for each distinct capital period
4. **Realized APR**: Focus only on actual collected fees, not unrealized gains

## Mathematical Foundation

### Basic Formula

For a single period:
```
Period APR = (Allocated Fees / Cost Basis) / (Period Days / 365) * 100
```

For the entire position:
```
Total APR = Σ(Period APR × Period Weight) / Σ(Period Weight)
where Period Weight = Period Days × Cost Basis
```

### Time-Weighted Average Cost Basis

```
TWACB = Σ(Cost Basis × Period Days) / Σ(Period Days)
```

### Alternative Total APR Calculation

```
Total APR = (Total Fees Collected / TWACB) / (Total Days / 365) * 100
```

## Algorithm Details

### Step 1: Create Capital Periods

Each `PositionEvent` with type `INCREASE` or `DECREASE` creates a new capital period:

1. **Period Start**: Event timestamp
2. **Period End**: Next event timestamp (or current time for latest)
3. **Period Cost Basis**: `costBasisAfter` from the event
4. **Period Duration**: End time - Start time (in days)

**Special Cases:**
- Latest event has no end date (open period) → Excluded from APR calculation
- `COLLECT` events don't create periods (they only collect fees)
- Zero cost basis periods are tracked but excluded from APR calculation

### Step 2: Distribute Collected Fees

For each `COLLECT` event with `feeValueInQuote > 0`:

1. **Identify Active Periods**: All periods that existed when fees were earned
2. **Calculate Weights**: For each period: `Weight = Period Days × Cost Basis`
3. **Distribute Proportionally**:
   ```
   Allocated Fee = Total Fee × (Period Weight / Total Weight)
   ```

**Fee Distribution Rules:**
- Fees are distributed to all periods that existed before the collect event
- Periods are weighted by both duration and capital amount
- Zero cost basis periods receive no fee allocation

### Step 3: Calculate Period APRs

For each period with allocated fees:

```
Period APR = (Allocated Fees / Cost Basis) / (Period Days / 365) * 100
```

### Step 4: Calculate Total Position APR

Using time-weighted average:

```
Total APR = Σ(Total Allocated Fees) / TWACB / (Total Active Days / 365) * 100
```

## Data Model

### PositionEventApr (1:1 with PositionEvent)

```typescript
interface PositionEventApr {
  id: string;
  eventId: string; // Foreign key to PositionEvent

  // Period Definition
  periodStartDate: Date;
  periodEndDate: Date | null; // null for latest event
  periodDays: number | null;  // null for latest event

  // Financial Data (BigInt as String)
  periodCostBasis: string;    // costBasisAfter from event
  allocatedFees: string;      // Fees allocated to this period
  periodApr: number | null;   // APR for this period

  // Metadata
  calculatedAt: Date;
  isValid: boolean;
}
```

## Worked Example

### Position Events Timeline

```
Event 1 (INCREASE):
- Date: 2024-01-01
- Amount: 10,000 USDC invested
- costBasisAfter: 10,000 USDC

Event 2 (INCREASE):
- Date: 2024-02-01 (31 days later)
- Amount: 5,000 USDC invested
- costBasisAfter: 15,000 USDC

Event 3 (COLLECT):
- Date: 2024-03-01 (29 days after Event 2)
- Fees collected: 150 USDC

Event 4 (DECREASE):
- Date: 2024-04-01 (31 days after Event 3)
- Amount: 8,000 USDC withdrawn
- costBasisAfter: 7,000 USDC
```

### Period Creation

```
Period 1: 2024-01-01 to 2024-02-01
- Duration: 31 days
- Cost Basis: 10,000 USDC
- Weight: 31 × 10,000 = 310,000

Period 2: 2024-02-01 to 2024-03-01
- Duration: 29 days
- Cost Basis: 15,000 USDC
- Weight: 29 × 15,000 = 435,000

Period 3: 2024-03-01 to 2024-04-01
- Duration: 31 days
- Cost Basis: 15,000 USDC
- Weight: 31 × 15,000 = 465,000

Period 4: 2024-04-01 onwards
- Duration: N/A (open period)
- Cost Basis: 7,000 USDC
- Excluded from APR calculation
```

### Fee Distribution (150 USDC collected on 2024-03-01)

```
Total Weight (Periods 1 & 2): 310,000 + 435,000 = 745,000

Period 1 Allocation: 150 × (310,000 / 745,000) = 62.42 USDC
Period 2 Allocation: 150 × (435,000 / 745,000) = 87.58 USDC
Period 3 Allocation: 0 USDC (period started after collect)
```

### APR Calculation

```
Period 1 APR: (62.42 / 10,000) / (31 / 365) * 100 = 7.34%
Period 2 APR: (87.58 / 15,000) / (29 / 365) * 100 = 7.35%

Time-Weighted Average Cost Basis:
(10,000 × 31 + 15,000 × 29) / (31 + 29) = 12,750 USDC

Total APR: (150 / 12,750) / (60 / 365) * 100 = 7.35%
```

## Edge Cases and Considerations

### 1. Zero Cost Basis Periods
- **Scenario**: Position completely closed (costBasisAfter = 0)
- **Handling**: Period tracked but excluded from fee distribution and APR calculation

### 2. No Fee Collections
- **Scenario**: Position has no COLLECT events
- **Handling**: All periods show 0% APR, total APR = 0%

### 3. Single Event Position
- **Scenario**: Only one INCREASE event, no subsequent events
- **Handling**: One open period created, excluded from APR calculation

### 4. Collect Before Any Capital
- **Scenario**: COLLECT event before any INCREASE events
- **Handling**: Fees ignored (no active periods to allocate to)

### 5. Simultaneous Events
- **Scenario**: Multiple events in same block/transaction
- **Handling**: Process in order: INCREASE → DECREASE → COLLECT

### 6. Negative Cost Basis Changes
- **Scenario**: DECREASE event removes more value than cost basis
- **Handling**: costBasisAfter can be 0 but not negative (handled by ledger service)

## Implementation Notes

### Database Considerations

1. **1:1 Relationship**: Each PositionEvent has exactly one PositionEventApr
2. **Cascade Deletes**: APR data automatically cleaned up when events deleted
3. **BigInt Precision**: All monetary values stored as strings to maintain precision
4. **Incremental Updates**: Only recalculate when position events change

### Performance Optimizations

1. **Lazy Calculation**: APR calculated on-demand, cached in database
2. **Batch Processing**: Process all periods for a position together
3. **Invalidation**: Mark APR data invalid when position events change
4. **Index Optimization**: Index on eventId and isValid for fast lookups

### API Design

```
GET /api/positions/uniswapv3/nft/[chain]/[nft]/apr
- Returns calculated APR data
- Automatically calculates if not cached or invalid
- To force fresh data, use the refresh endpoint first
```

### Response Format

```json
{
  "chain": "ethereum",
  "nftId": "12345",
  "totalApr": 7.35,
  "timeWeightedCostBasis": "12750000000",
  "totalFeesCollected": "150000000",
  "totalActiveDays": 60,
  "calculatedAt": "2024-04-15T10:30:00Z",
  "periods": [
    {
      "eventId": "evt_1",
      "periodStartDate": "2024-01-01T00:00:00Z",
      "periodEndDate": "2024-02-01T00:00:00Z",
      "periodDays": 31,
      "periodCostBasis": "10000000000",
      "allocatedFees": "62420000",
      "periodApr": 7.34
    },
    {
      "eventId": "evt_2",
      "periodStartDate": "2024-02-01T00:00:00Z",
      "periodEndDate": "2024-03-01T00:00:00Z",
      "periodDays": 29,
      "periodCostBasis": "15000000000",
      "allocatedFees": "87580000",
      "periodApr": 7.35
    }
  ]
}
```

## Testing Strategy

### Unit Tests
1. **Period Creation**: Test period boundaries and duration calculations
2. **Fee Distribution**: Test proportional allocation across periods
3. **APR Calculation**: Test mathematical accuracy for various scenarios
4. **Edge Cases**: Test all documented edge cases

### Integration Tests
1. **End-to-End**: Full position lifecycle with multiple events
2. **API Endpoints**: Test both GET and POST endpoints
3. **Database Integrity**: Test cascade deletes and data consistency
4. **Performance**: Test with large numbers of events

### Test Scenarios
1. **Simple Position**: Single increase, multiple collects, single decrease
2. **Complex Position**: Multiple increases/decreases with interspersed collects
3. **Zero Fees**: Position with no fee collections
4. **Rapid Trading**: Multiple events in short time periods
5. **Long Duration**: Position spanning multiple years

## Conclusion

This APR calculation method provides an accurate, time-weighted measure of realized returns for Uniswap V3 positions. By accounting for varying capital deployment over time and fairly distributing fees across active periods, it gives users a true picture of their position's performance based on actual fee collections rather than theoretical projections.

The implementation maintains precision through BigInt arithmetic, handles edge cases gracefully, and integrates seamlessly with the existing event-driven architecture of the DUNCAN platform.