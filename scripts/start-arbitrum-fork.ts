#!/usr/bin/env tsx

import { spawn, ChildProcess } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createPublicClient, createWalletClient, http, parseEther, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrum } from 'viem/chains';
import { getChainConfig } from '../src/config/chains';
import { normalizeAddress } from '../src/lib/utils/evm';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const ARBITRUM_FORK_PORT = 8545;
const ARBITRUM_CHAIN_ID = 42161;
const TEST_USER_ADDRESS = normalizeAddress('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
const ANVIL_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

// Arbitrum token addresses (properly checksummed)
const WETH_ADDRESS = normalizeAddress('0x82aF49447D8a07e3bd95BD0d56f35241523fBAb1');
const USDC_ADDRESS = normalizeAddress('0xaf88d065e77c8cC2239327C5EDb3A432268e5831');

async function fundTestUser() {
  console.log('\nFunding test user address with tokens...');

  const publicClient = createPublicClient({
    chain: arbitrum,
    transport: http(`http://localhost:${ARBITRUM_FORK_PORT}`)
  });

  try {
    // Fund with 10 WETH - deposit directly as test user
    console.log('Funding 10 WETH...');

    // Create wallet client for test user
    const testUserClient = createWalletClient({
      account: TEST_USER_ADDRESS as `0x${string}`,
      chain: arbitrum,
      transport: http(`http://localhost:${ARBITRUM_FORK_PORT}`)
    });

    const wethTx = await testUserClient.writeContract({
      address: WETH_ADDRESS as `0x${string}`,
      abi: [
        {
          name: 'deposit',
          type: 'function',
          stateMutability: 'payable',
          inputs: [],
          outputs: []
        }
      ],
      functionName: 'deposit',
      value: parseEther('10')
    });

    await publicClient.waitForTransactionReceipt({ hash: wethTx });
    console.log(`✅ WETH deposit successful: ${wethTx}`);

    // Fund with 100,000 USDC by impersonating a whale
    console.log('Funding 100,000 USDC...');

    // Use anvil_impersonateAccount to impersonate a USDC whale
    const USDC_WHALE = normalizeAddress('0x47c031236e19d024b42f8AE6780E44A573170703'); // Circle's USDC treasury

    await fetch(`http://localhost:${ARBITRUM_FORK_PORT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'anvil_impersonateAccount',
        params: [USDC_WHALE],
        id: 1
      })
    });

    // Fund the whale account with ETH for gas
    await fetch(`http://localhost:${ARBITRUM_FORK_PORT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'anvil_setBalance',
        params: [USDC_WHALE, '0x56BC75E2D630E8000'], // 100 ETH in hex
        id: 2
      })
    });

    const whaleClient = createWalletClient({
      account: USDC_WHALE as `0x${string}`,
      chain: arbitrum,
      transport: http(`http://localhost:${ARBITRUM_FORK_PORT}`)
    });

    const usdcTransferTx = await whaleClient.writeContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: [
        {
          name: 'transfer',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }]
        }
      ],
      functionName: 'transfer',
      args: [TEST_USER_ADDRESS as `0x${string}`, parseUnits('100000', 6)] // USDC has 6 decimals
    });

    await publicClient.waitForTransactionReceipt({ hash: usdcTransferTx });
    console.log(`✅ USDC transfer successful: ${usdcTransferTx}`);

    // Stop impersonating
    await fetch(`http://localhost:${ARBITRUM_FORK_PORT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'anvil_stopImpersonatingAccount',
        params: [USDC_WHALE],
        id: 1
      })
    });

    console.log(`\n✅ Test user ${TEST_USER_ADDRESS} funded successfully!`);
    console.log('  - 10 WETH');
    console.log('  - 100,000 USDC');

  } catch (error) {
    console.error('Error funding test user:', error);
    throw error;
  }
}

async function startArbitrumFork() {
  try {
    const arbitrumConfig = getChainConfig('arbitrum');
    const rpcUrl = arbitrumConfig.rpcUrl;

    if (!rpcUrl) {
      throw new Error('NEXT_PUBLIC_ARBITRUM_RPC_URL is not defined in environment variables');
    }

    console.log(`Starting Arbitrum fork on port ${ARBITRUM_FORK_PORT}...`);
    console.log(`Forking from: ${rpcUrl}`);

    const anvilProcess: ChildProcess = spawn('anvil', [
      '--fork-url', rpcUrl,
      '--port', ARBITRUM_FORK_PORT.toString(),
      '--chain-id', ARBITRUM_CHAIN_ID.toString(),
      '--accounts', '10',
      '--balance', '10000',
      '--code-size-limit', '50000',
      '--disable-block-gas-limit'
    ], {
      stdio: 'inherit'
    });

    anvilProcess.on('error', (error: Error) => {
      console.error('Failed to start Anvil:', error.message);
      process.exit(1);
    });

    anvilProcess.on('close', (code: number | null) => {
      console.log(`Anvil process exited with code ${code}`);
    });

    // Wait for Anvil to be ready and then fund the test user
    setTimeout(async () => {
      try {
        await fundTestUser();
      } catch (error) {
        console.error('Failed to fund test user, but fork will continue running:', error);
      }
    }, 3000);

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\nShutting down Arbitrum fork...');
      anvilProcess.kill('SIGTERM');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      anvilProcess.kill('SIGTERM');
      process.exit(0);
    });

  } catch (error) {
    console.error('Error starting Arbitrum fork:', error);
    process.exit(1);
  }
}

startArbitrumFork();