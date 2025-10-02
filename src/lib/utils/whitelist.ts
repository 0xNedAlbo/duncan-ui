import { normalizeAddress, isValidAddress } from "./evm"

/**
 * Check if an address is whitelisted for registration
 *
 * Reads REGISTRATION_WHITELIST environment variable containing comma-separated addresses.
 * If whitelist is not set or empty, all addresses are allowed (open registration).
 *
 * @param address - The wallet address to check
 * @returns true if address is whitelisted or whitelist is disabled, false otherwise
 */
export function isAddressWhitelisted(address: string): boolean {
  // Validate input address
  if (!isValidAddress(address)) {
    return false
  }

  const whitelistEnv = process.env.REGISTRATION_WHITELIST

  // If whitelist is not configured or empty, allow all addresses
  if (!whitelistEnv || whitelistEnv.trim() === '') {
    return true
  }

  // Parse whitelist: split by comma, trim, and normalize all addresses
  const whitelistedAddresses = whitelistEnv
    .split(',')
    .map(addr => addr.trim())
    .filter(addr => isValidAddress(addr))
    .map(addr => normalizeAddress(addr))

  // Normalize the input address for comparison
  const normalizedAddress = normalizeAddress(address)

  // Check if address is in whitelist (case-insensitive via normalization)
  return whitelistedAddresses.includes(normalizedAddress)
}
