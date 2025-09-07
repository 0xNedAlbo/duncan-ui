#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';

/**
 * Migration script to populate TokenReference table from existing data
 * This script should be run after the TokenReference table is created
 * to migrate existing pools to use the new polymorphic token system
 */

const prisma = new PrismaClient();

async function migrateTokenReferences() {
  console.log('🔄 Starting TokenReference migration...');

  try {
    // Get all existing global tokens
    console.log('📊 Migrating global tokens...');
    const globalTokens = await prisma.token.findMany();
    
    let globalRefCount = 0;
    for (const token of globalTokens) {
      // Check if reference already exists
      const existingRef = await prisma.tokenReference.findFirst({
        where: {
          chain: token.chain,
          address: token.address,
          tokenType: 'global'
        }
      });

      if (!existingRef) {
        await prisma.tokenReference.create({
          data: {
            tokenType: 'global',
            globalTokenId: token.id,
            chain: token.chain,
            address: token.address,
            symbol: token.symbol,
          }
        });
        globalRefCount++;
      }
    }

    console.log(`✅ Created ${globalRefCount} global token references`);

    // Get all existing user tokens
    console.log('📊 Migrating user tokens...');
    const userTokens = await prisma.userToken.findMany();
    
    let userRefCount = 0;
    for (const token of userTokens) {
      // Check if reference already exists
      const existingRef = await prisma.tokenReference.findFirst({
        where: {
          chain: token.chain,
          address: token.address,
          tokenType: 'user'
        }
      });

      if (!existingRef) {
        await prisma.tokenReference.create({
          data: {
            tokenType: 'user',
            userTokenId: token.id,
            chain: token.chain,
            address: token.address,
            symbol: token.symbol,
          }
        });
        userRefCount++;
      }
    }

    console.log(`✅ Created ${userRefCount} user token references`);

    // Update existing pools to use token references
    console.log('📊 Updating existing pools...');
    const pools = await prisma.pool.findMany({
      where: {
        OR: [
          { token0RefId: null },
          { token1RefId: null }
        ]
      }
    });

    let poolUpdateCount = 0;
    for (const pool of pools) {
      const [token0Ref, token1Ref] = await Promise.all([
        prisma.tokenReference.findFirst({
          where: {
            chain: pool.chain,
            address: pool.token0Address
          }
        }),
        prisma.tokenReference.findFirst({
          where: {
            chain: pool.chain,
            address: pool.token1Address
          }
        })
      ]);

      if (token0Ref && token1Ref) {
        await prisma.pool.update({
          where: { id: pool.id },
          data: {
            token0RefId: token0Ref.id,
            token1RefId: token1Ref.id
          }
        });
        poolUpdateCount++;
      } else {
        console.warn(`⚠️  Could not find token references for pool ${pool.id} (${pool.token0Address}/${pool.token1Address})`);
      }
    }

    console.log(`✅ Updated ${poolUpdateCount} pools with token references`);

    // Summary
    const totalRefs = await prisma.tokenReference.count();
    const totalPools = await prisma.pool.count();
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Global token references: ${globalRefCount}`);
    console.log(`   User token references: ${userRefCount}`);
    console.log(`   Updated pools: ${poolUpdateCount}`);
    console.log(`   Total references: ${totalRefs}`);
    console.log(`   Total pools: ${totalPools}`);
    console.log('\n✅ TokenReference migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function cleanupOrphanedReferences() {
  console.log('\n🧹 Cleaning up orphaned references...');

  const orphanedGlobal = await prisma.tokenReference.count({
    where: {
      tokenType: 'global',
      globalToken: null
    }
  });

  const orphanedUser = await prisma.tokenReference.count({
    where: {
      tokenType: 'user',
      userToken: null
    }
  });

  if (orphanedGlobal > 0 || orphanedUser > 0) {
    console.log(`🗑️  Found ${orphanedGlobal} orphaned global refs and ${orphanedUser} orphaned user refs`);
    
    await prisma.tokenReference.deleteMany({
      where: {
        OR: [
          {
            tokenType: 'global',
            globalToken: null
          },
          {
            tokenType: 'user',
            userToken: null
          }
        ]
      }
    });

    console.log('✅ Orphaned references cleaned up');
  } else {
    console.log('✅ No orphaned references found');
  }
}

async function main() {
  console.log('🚀 TokenReference Migration Script');
  console.log('==================================\n');

  await migrateTokenReferences();
  await cleanupOrphanedReferences();

  await prisma.$disconnect();
  console.log('\n🎉 Migration completed successfully!');
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { migrateTokenReferences, cleanupOrphanedReferences };