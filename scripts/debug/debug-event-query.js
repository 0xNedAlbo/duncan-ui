#!/usr/bin/env node

// Debug script to show exact subgraph queries being generated

// Sample position data (replace with your actual position data)
const samplePosition = {
  pool: {
    chain: "arbitrum",
    poolAddress: "0x641c00a822e8b671738d32a431a4fb6074e5c79d", // Example WETH/USDC pool on Arbitrum
  },
  tickLower: -276320,
  tickUpper: -276310,
  owner: "0x1234567890123456789012345678901234567890", // Replace with actual owner address
  nftId: "4865121"
};

function generateEventQueries(position) {
  const poolAddress = position.pool.poolAddress.toLowerCase();
  const tickLower = position.tickLower;
  const tickUpper = position.tickUpper;
  const owner = position.owner?.toLowerCase();
  
  // Construct where clause for event filtering using correct V3 subgraph schema
  const positionFilter = `
    pool: "${poolAddress}",
    tickLower: ${tickLower},
    tickUpper: ${tickUpper}${owner ? `,
    owner: "${owner}"` : ''}
  `.trim();

  const queries = {};

  // Query for Mint events (CREATE/INCREASE liquidity)
  queries.mintEventsQuery = `
query GetMintEvents($first: Int!, $skip: Int!) {
  mints(
    first: $first,
    skip: $skip,
    orderBy: timestamp,
    orderDirection: asc,
    where: {
      ${positionFilter}
    }
  ) {
    id
    timestamp
    transaction {
      id
      blockNumber
    }
    amount
    amount0
    amount1
  }
}`;

  // Query for Burn events (DECREASE/CLOSE liquidity)
  queries.burnEventsQuery = `
query GetBurnEvents($first: Int!, $skip: Int!) {
  burns(
    first: $first,
    skip: $skip,
    orderBy: timestamp,
    orderDirection: asc,
    where: {
      ${positionFilter}
    }
  ) {
    id
    timestamp
    blockNumber
    transaction {
      id
    }
    amount
    amount0
    amount1
  }
}`;

  // Query for Collect events (fee collection)
  queries.collectEventsQuery = `
query GetCollectEvents($first: Int!, $skip: Int!) {
  collects(
    first: $first,
    skip: $skip,
    orderBy: timestamp,
    orderDirection: asc,
    where: {
      ${positionFilter}
    }
  ) {
    id
    timestamp
    blockNumber
    transaction {
      id
    }
    amount0
    amount1
  }
}`;

  return queries;
}

console.log("=== DEBUG: Event Sync Queries ===");
console.log("Position data:", JSON.stringify(samplePosition, null, 2));
console.log("\n");

const queries = generateEventQueries(samplePosition);

console.log("=== MINT EVENTS QUERY ===");
console.log(queries.mintEventsQuery);
console.log("\n");

console.log("=== BURN EVENTS QUERY ===");
console.log(queries.burnEventsQuery);
console.log("\n");

console.log("=== COLLECT EVENTS QUERY ===");
console.log(queries.collectEventsQuery);
console.log("\n");

console.log("=== VARIABLES FOR TESTING ===");
console.log(JSON.stringify({ first: 10, skip: 0 }, null, 2));

console.log("\n=== INSTRUCTIONS ===");
console.log("1. Go to: https://thegraph.com/hosted-service/subgraph/uniswap/uniswap-v3-arbitrum");
console.log("2. Copy one of the queries above");  
console.log("3. Use the variables shown above");
console.log("4. Update the sample position data at the top of this script with your actual position data");
console.log("5. If no results, try removing the owner filter or adjusting tick values");

console.log("\n=== DEBUGGING QUERIES FOR RECENT TRANSACTIONS ===");

// Query to find recent mints for the pool (last 24 hours)
const recentMintsQuery = `
query FindRecentMints {
  mints(
    first: 20,
    orderBy: timestamp,
    orderDirection: desc,
    where: {
      pool: "0xc6962004f452be9203591991d15f6b388e09e8d0",
      timestamp_gt: "${Math.floor(Date.now() / 1000) - 86400}"
    }
  ) {
    id
    timestamp
    owner
    tickLower
    tickUpper
    amount
    amount0
    amount1
    transaction {
      id
      blockNumber
    }
  }
}`;

// Query to find any transactions in the pool today
const todayTransactionsQuery = `
query FindTodayTransactions {
  transactions(
    first: 50,
    orderBy: timestamp,
    orderDirection: desc,
    where: {
      timestamp_gt: "${Math.floor(Date.now() / 1000) - 86400}"
    }
  ) {
    id
    timestamp
    blockNumber
    mints(where: { pool: "0xc6962004f452be9203591991d15f6b388e09e8d0" }) {
      id
      owner
      tickLower
      tickUpper
      amount
    }
    burns(where: { pool: "0xc6962004f452be9203591991d15f6b388e09e8d0" }) {
      id
      owner
      tickLower
      tickUpper
      amount
    }
    collects(where: { pool: "0xc6962004f452be9203591991d15f6b388e09e8d0" }) {
      id
      owner
      amount0
      amount1
    }
  }
}`;

console.log("=== RECENT MINTS QUERY (Last 24h) ===");
console.log(recentMintsQuery);
console.log("\n");

console.log("=== TODAY TRANSACTIONS QUERY ===");
console.log(todayTransactionsQuery);
console.log("\n");