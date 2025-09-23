#!/usr/bin/env tsx

/**
 * Script to test the address checksum middleware
 */

import { PrismaClient } from '@prisma/client';
import { addressChecksumExtension } from '../../src/lib/validation/addressChecksum';

const prisma = new PrismaClient().$extends(addressChecksumExtension);

async function main() {
  try {
    // Test with lowercase address (should be automatically normalized)
    const testAddress = '0x742d35cc6635c0532925a3b8d85162c6bf8d9d0c'; // lowercase version - different from existing user
    const expectedAddress = '0x742d35Cc6635C0532925a3b8D85162c6bF8d9d0c'; // EIP-55 version

    console.log(JSON.stringify({
      testCase: "Creating user with lowercase address",
      inputAddress: testAddress,
      expectedAddress: expectedAddress
    }, null, 2));

    // Try to create a user with lowercase address
    const testUser = await prisma.user.create({
      data: {
        name: 'Middleware Test User',
        address: testAddress, // lowercase input
      }
    });

    console.log(JSON.stringify({
      success: true,
      result: "Address normalized by middleware",
      actualAddress: testUser.address,
      isEIP55Compliant: testUser.address === expectedAddress
    }, null, 2));

    // Clean up - delete the test user
    await prisma.user.delete({
      where: { id: testUser.id }
    });

    console.log(JSON.stringify({
      cleanup: "Test user deleted successfully"
    }, null, 2));

    // Test with invalid address (should throw error)
    try {
      await prisma.user.create({
        data: {
          name: 'Invalid Address Test',
          address: 'invalid-address'
        }
      });

      console.log(JSON.stringify({
        error: "Middleware should have rejected invalid address"
      }));
    } catch (error) {
      console.log(JSON.stringify({
        success: true,
        result: "Middleware correctly rejected invalid address",
        error: error instanceof Error ? error.message : "Unknown error"
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