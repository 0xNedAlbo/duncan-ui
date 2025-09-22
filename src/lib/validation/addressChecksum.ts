// src/lib/validation/addressChecksum.ts
import { normalizeAddress, isValidAddress } from '@/lib/utils/evm'

// Configure which models/fields carry EVM addresses
const ADDRESS_FIELDS: Record<string, string[]> = {
  User: ['address'],
  Token: ['address'],
  Pool: ['poolAddress', 'token0Address', 'token1Address'],
  Position: ['owner', 'poolAddress'],
  PoolPriceCache: ['poolAddress']
}

// Helper function to normalize addresses in data
const normalizeAddressesInData = (model: string, data: any): any => {
  if (!data || typeof data !== 'object') return data

  const fields = ADDRESS_FIELDS[model] ?? []
  if (fields.length === 0) return data

  const normalizedData = { ...data }

  for (const field of fields) {
    if (normalizedData[field] != null && typeof normalizedData[field] === 'string') {
      if (!isValidAddress(normalizedData[field])) {
        throw new Error(`Invalid EVM address for field ${field}: ${normalizedData[field]}`)
      }
      normalizedData[field] = normalizeAddress(normalizedData[field])
    }
  }

  return normalizedData
}

// Prisma client extension for address normalization
export const addressChecksumExtension = {
  query: {
    $allOperations({ model, operation, args, query }: any) {
      if (!model || !args) return query(args)

      // Clone args to avoid mutation
      const normalizedArgs = { ...args }

      // Handle different operations that accept data
      if (operation === 'create' && normalizedArgs.data) {
        normalizedArgs.data = normalizeAddressesInData(model, normalizedArgs.data)
      } else if (operation === 'update' && normalizedArgs.data) {
        normalizedArgs.data = normalizeAddressesInData(model, normalizedArgs.data)
      } else if (operation === 'upsert') {
        if (normalizedArgs.create) {
          normalizedArgs.create = normalizeAddressesInData(model, normalizedArgs.create)
        }
        if (normalizedArgs.update) {
          normalizedArgs.update = normalizeAddressesInData(model, normalizedArgs.update)
        }
      } else if (operation === 'createMany' && normalizedArgs.data && Array.isArray(normalizedArgs.data)) {
        normalizedArgs.data = normalizedArgs.data.map((item: any) =>
          normalizeAddressesInData(model, item)
        )
      }

      return query(normalizedArgs)
    },
  },
}