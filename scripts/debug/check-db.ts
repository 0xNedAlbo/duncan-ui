#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking database contents...\n');

  // Check users
  const users = await prisma.user.findMany();
  console.log('👥 Users:');
  console.log(JSON.stringify(users, null, 2));
  console.log('');

  // Check API keys
  const apiKeys = await prisma.apiKey.findMany();
  console.log('🔑 API Keys:');
  console.log(JSON.stringify(apiKeys, null, 2));
  console.log('');

  // Check tokens
  const tokens = await prisma.token.findMany();
  console.log('🪙 Tokens:');
  console.log(JSON.stringify(tokens, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });