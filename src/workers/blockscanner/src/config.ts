// Blockscanner Worker Configuration
// Constants and chain setup for event scanning

import { SUPPORTED_CHAINS, type SupportedChainsType } from "@/config/chains";
import { EtherscanClient } from "@/services/etherscan/etherscanClient";
import { EvmBlockInfoService } from "@/services/evm/evmBlockInfoService";
import { BackendRpcClients } from "@/services/evm/rpcClients";
import { NONFUNGIBLE_POSITION_MANAGER_ADDRESSES, getChainId } from "@/lib/contracts/nonfungiblePositionManager";
import { DefaultServiceFactory } from "@/services/ServiceFactory";
import type { PositionLedgerService } from "@/services/positions/positionLedgerService";

// ═══════════════════════════════════════════════════════════════════════════════
// UNISWAP V3 NONFUNGIBLE POSITION MANAGER ADDRESSES
// ═══════════════════════════════════════════════════════════════════════════════

// Helper function to get NFPM address for a chain
export function getNFPMAddress(chain: SupportedChainsType): string {
  const chainId = getChainId(chain);
  const address = NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId];
  if (!address) {
    throw new Error(`No NFPM address configured for chain: ${chain} (chainId: ${chainId})`);
  }
  return address;
}

// Event signatures (keccak256)
export const TOPICS = {
  INCREASE_LIQUIDITY:
    "0x3067048beee31b25b2f1681f88dac838c8bba36af25bfb2b7cf7473a5847e35f", // IncreaseLiquidity(uint256,uint128,uint256,uint256)
  DECREASE_LIQUIDITY:
    "0x26f6a048ee9138f2c0ce266f322cb99228e8d619ae2bff30c67f8dcf9d2377b4", // DecreaseLiquidity(uint256,uint128,uint256,uint256)
  COLLECT:
    "0x40d0efd1a53d60ecbf40971b9daf7dc90178c3aadc7aab1765632738fa8b8f01", // Collect(uint256,address,uint256,uint256)
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TIMING CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const POLL_INTERVAL_MS = 60_000; // Run every 60 seconds
export const WINDOW_BLOCKS = 100_000; // Sliding window size (≈3-10 min on Arbitrum)
export const SAFETY_BUFFER = 2_000; // Rollback safety margin

// ═══════════════════════════════════════════════════════════════════════════════
// ETHERSCAN API CHUNKING PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════════

export const CHUNK_MIN = 1_000; // Minimum block span per Etherscan getLogs call
export const CHUNK_MAX = 5_000; // Maximum block span per Etherscan getLogs call (conservative)
export const TARGET_LOGS_PER_CALL = 3_000; // Adaptive target for chunk sizing

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChainClientConfig {
  chain: SupportedChainsType;
  etherscanClient: EtherscanClient;
  blockInfoService: EvmBlockInfoService;
  positionLedgerService: PositionLedgerService;
}

// Parse SCAN_CHAINS from environment or default to all supported chains
function getParsedChains(): SupportedChainsType[] {
  const envChains = process.env.SCAN_CHAINS;
  if (!envChains) {
    return SUPPORTED_CHAINS as SupportedChainsType[];
  }

  const chains = envChains
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter((c) => SUPPORTED_CHAINS.includes(c)) as SupportedChainsType[];

  if (chains.length === 0) {
    throw new Error(
      `Invalid SCAN_CHAINS: "${envChains}". Supported: ${SUPPORTED_CHAINS.join(", ")}`
    );
  }

  return chains;
}

// Initialize Etherscan client (singleton - shared across all chains)
let etherscanClientInstance: EtherscanClient | null = null;

export function getEtherscanClient(): EtherscanClient {
  if (!etherscanClientInstance) {
    if (!process.env.ETHERSCAN_API_KEY) {
      throw new Error("ETHERSCAN_API_KEY environment variable is required");
    }
    etherscanClientInstance = new EtherscanClient();
  }
  return etherscanClientInstance;
}

// Initialize chain clients with Etherscan API + BlockInfoService for block queries
export function initializeChainClients(): ChainClientConfig[] {
  const chains = getParsedChains();
  const etherscanClient = getEtherscanClient();
  const rpcClients = new BackendRpcClients();
  const blockInfoService = new EvmBlockInfoService(rpcClients.getClients());
  const services = DefaultServiceFactory.getInstance().getServices();
  const positionLedgerService = services.positionLedgerService;
  const configs: ChainClientConfig[] = [];

  for (const chain of chains) {
    configs.push({
      chain,
      etherscanClient,
      blockInfoService,
      positionLedgerService,
    });
  }

  return configs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const LOG_LEVEL =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");
