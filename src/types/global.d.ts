import { PrismaClient } from '@prisma/client';

declare global {
  var __testPrisma: PrismaClient | undefined;
}