import { PrismaClient } from '@prisma/client'
import { addressChecksumExtension } from '@/lib/validation/addressChecksum'

const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined
}

const createPrismaClient = () => {
  const client = new PrismaClient().$extends(addressChecksumExtension)
  return client
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma