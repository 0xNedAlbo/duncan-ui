/**
 * EVM Address Utilities
 * Single source of truth for all EVM address operations
 */

import { getAddress } from "viem";

/**
 * Validates if an address is a proper Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/i.test(address);
}

/**
 * Normalize address to EIP-55 checksum format
 * Uses viem's getAddress() for proper checksumming
 */
export function normalizeAddress(address: string): string {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
  return getAddress(address);
}

/**
 * Compare two addresses for deterministic ordering
 * Normalizes both addresses to ensure consistent comparison
 * @param addressA First address
 * @param addressB Second address
 * @returns -1 if A < B, 0 if A === B, 1 if A > B
 */
export function compareAddresses(addressA: string, addressB: string): number {
  const normalizedA = normalizeAddress(addressA);
  const normalizedB = normalizeAddress(addressB);

  // Use BigInt comparison for deterministic numerical ordering
  const bigintA = BigInt(normalizedA);
  const bigintB = BigInt(normalizedB);

  if (bigintA < bigintB) return -1;
  if (bigintA > bigintB) return 1;
  return 0;
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

/**
 * Truncate an address for display purposes
 * @param address The address to truncate
 * @param startChars Number of characters to show at start (default: 6 including 0x)
 * @param endChars Number of characters to show at end (default: 4)
 * @returns Truncated address like "0x1234...abcd"
 */
export function truncateAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  const normalized = normalizeAddress(address);
  return `${normalized.slice(0, startChars)}...${normalized.slice(-endChars)}`;
}

/**
 * Truncate text to a maximum length with ellipsis
 * @param text The text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with "..." if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Get block explorer URL for an address on a specific chain
 * @param address The contract address
 * @param chain The chain identifier
 * @returns Explorer URL for the address
 */
export function getExplorerAddressUrl(address: string, chain: string): string {
  const normalized = normalizeAddress(address);

  // Import here to avoid circular dependency
  const explorerUrls: Record<string, string> = {
    'ethereum': 'https://etherscan.io',
    'arbitrum': 'https://arbiscan.io',
    'base': 'https://basescan.org'
  };

  const baseUrl = explorerUrls[chain.toLowerCase()];
  if (!baseUrl) {
    throw new Error(`Unsupported chain for explorer: ${chain}`);
  }

  return `${baseUrl}/address/${normalized}`;
}