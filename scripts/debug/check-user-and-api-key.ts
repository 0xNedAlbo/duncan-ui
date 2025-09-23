#!/usr/bin/env tsx

/**
 * Script to check the seeded user and API key in the database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Get test user
    const testAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const testUser = await prisma.user.findUnique({
      where: { address: testAddress }
    });

    console.log(JSON.stringify({
      userFound: !!testUser,
      user: testUser,
    }, null, 2));

    if (testUser) {
      // Get API keys for this user
      const apiKeys = await prisma.apiKey.findMany({
        where: { userId: testUser.id }
      });

      console.log(JSON.stringify({
        apiKeyCount: apiKeys.length,
        apiKeys: apiKeys.map(key => ({
          id: key.id,
          name: key.name,
          prefix: key.prefix,
          createdAt: key.createdAt
        }))
      }, null, 2));
    }

  } catch (error) {
    console.log(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }));
  } finally {
    await prisma.$disconnect();
  }
}

main();