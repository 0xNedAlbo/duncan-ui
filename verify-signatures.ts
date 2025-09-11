/**
 * Verify event signatures for Uniswap V3 NFT Position Manager
 */

import { keccak256, toBytes } from 'viem';

// Calculate event signatures
const signatures = {
  INCREASE_LIQUIDITY: 'IncreaseLiquidity(uint256,uint128,uint256,uint256)',
  DECREASE_LIQUIDITY: 'DecreaseLiquidity(uint256,uint128,uint256,uint256)', 
  COLLECT: 'Collect(uint256,address,uint256,uint256)'
};

console.log('🔍 Verifying event signatures...\n');

Object.entries(signatures).forEach(([name, signature]) => {
  const hash = keccak256(toBytes(signature));
  console.log(`${name}:`);
  console.log(`  Signature: ${signature}`);
  console.log(`  Hash: ${hash}`);
  console.log('');
});

// Our current signatures
const currentSignatures = {
  INCREASE_LIQUIDITY: '0x3067048beee31b25b2f1681f88dac838c8bba36af25bfb2b7cf7473a5847e35f',
  DECREASE_LIQUIDITY: '0x26f6a048ee9138f2c0ce266f322cb99228e8d619ae2bff30c67f8dcf9d2377b4', 
  COLLECT: '0x70935338e69775456a85ddef226c395fb668b63fa0115f5f20610b388e6ca9c0'
};

console.log('🔄 Comparing with current signatures...\n');

Object.entries(currentSignatures).forEach(([name, current]) => {
  const correct = keccak256(toBytes(signatures[name as keyof typeof signatures]));
  const match = current.toLowerCase() === correct.toLowerCase();
  console.log(`${name}: ${match ? '✅' : '❌'}`);
  console.log(`  Current: ${current}`);
  console.log(`  Correct: ${correct}`);
  console.log('');
});