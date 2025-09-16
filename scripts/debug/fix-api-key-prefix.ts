#!/usr/bin/env node

/**
 * Fix API Key Prefix Script
 *
 * Updates the existing API key record to have the correct prefix
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // The API key used in debug script
    const apiKeyPlaintext = 'ak_live_zIdCcBStkntsCI_mVXqYUuNz5-VMSeGI-W8XWHn_C4A';
    const correctPrefix = apiKeyPlaintext.substring(0, 8); // 'ak_live_'

    console.log(`Updating API key prefix to: ${correctPrefix}`);

    // Update the existing API key record with correct prefix
    const updatedApiKey = await prisma.apiKey.updateMany({
      where: {
        name: 'Debug Scripts'
      },
      data: {
        prefix: correctPrefix
      }
    });

    if (updatedApiKey.count > 0) {
      console.log(`✅ Updated ${updatedApiKey.count} API key record(s) with correct prefix`);
    } else {
      console.log('❌ No API key records found to update');
    }

  } catch (error) {
    console.error('❌ Error updating API key prefix:', error);
    process.exit(1);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });