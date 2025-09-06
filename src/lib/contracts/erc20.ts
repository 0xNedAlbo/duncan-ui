/**
 * ERC-20 Token Contract ABI and utilities
 * Used for fetching token metadata directly from contracts
 */

export const ERC20_ABI = [
  // Read Functions - Standard ERC-20
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol", 
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view", 
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: bigint;
}

/**
 * Validates if an address is a proper Ethereum address format
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Normalize address to lowercase for consistency
 */
export function normalizeAddress(address: string): string {
  if (!isValidEthereumAddress(address)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
  return address.toLowerCase();
}

/**
 * Generate a placeholder token symbol from address
 */
export function generatePlaceholderSymbol(address: string): string {
  const normalized = normalizeAddress(address);
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

/**
 * Generate a placeholder token name from address
 */
export function generatePlaceholderName(address: string): string {
  const normalized = normalizeAddress(address);
  return `Unknown Token (${normalized.slice(0, 6)}...${normalized.slice(-4)})`;
}