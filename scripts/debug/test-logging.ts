#!/usr/bin/env npx tsx

/**
 * Test script for the structured logging framework
 * Tests service filtering, debug muting, and log structure
 */

import { createServiceLogger, createOperationLogger, LoggerControl, LogPatterns } from '@/lib/logging/loggerFactory';

async function testLogging() {
    try {
        console.log('Testing structured logging framework...\n');

        // Test 1: Basic service logging
        console.log('=== Test 1: Basic Service Logging ===');
        const positionLogger = createServiceLogger('PositionImportService');
        const etherscanLogger = createServiceLogger('EtherscanEventService');

        positionLogger.debug({ nftId: '123456', chain: 'ethereum' }, 'Starting position import');
        positionLogger.info({ positionId: 'pos_123', status: 'active' }, 'Position import completed');

        etherscanLogger.debug({ eventType: 'INCREASE_LIQUIDITY', logCount: 5 }, 'Retrieved raw logs');
        etherscanLogger.warn({ chain: 'arbitrum', attempts: 3 }, 'API rate limit reached');

        // Test 2: Operation context logging
        console.log('\n=== Test 2: Operation Context Logging ===');
        const opLogger = createOperationLogger('PositionLedgerService', 'syncEvents', {
            nftId: '789012',
            correlationId: `test-${Date.now()}`
        });

        opLogger.debug('Fetching events from Etherscan');
        opLogger.info({ eventCount: 12 }, 'Event sync completed');

        // Test 3: Log patterns
        console.log('\n=== Test 3: Log Patterns ===');
        const serviceLogger = createServiceLogger('TestService');

        LogPatterns.methodEntry(serviceLogger, 'processData', { userId: 'user_123', dataType: 'position' });
        LogPatterns.externalCall(serviceLogger, 'etherscan', '/api/logs', { fromBlock: 12345, toBlock: 12350 });
        LogPatterns.dbOperation(serviceLogger, 'SELECT', 'positions', { userId: 'user_123' });
        LogPatterns.methodExit(serviceLogger, 'processData', { result: 'success' });

        // Test 4: Error logging
        console.log('\n=== Test 4: Error Logging ===');
        try {
            throw new Error('Test error for logging');
        } catch (error) {
            LogPatterns.methodError(serviceLogger, 'processData', error as Error, { userId: 'user_123' });
        }

        // Test 5: Runtime control
        console.log('\n=== Test 5: Runtime Control ===');
        console.log('Registered services:', LoggerControl.getServices());

        console.log('\nMuting debug logs...');
        LoggerControl.setMuteDebug(true);

        positionLogger.debug({ test: 'this should be muted' }, 'Debug message after muting');
        positionLogger.info({ test: 'this should still appear' }, 'Info message after muting');

        console.log('\nUnmuting debug logs...');
        LoggerControl.setMuteDebug(false);

        positionLogger.debug({ test: 'this should appear again' }, 'Debug message after unmuting');

        console.log('\n=== Logging Test Completed Successfully ===');

        return { success: true };

    } catch (error) {
        console.error('Logging test failed:', error);
        return { error: error instanceof Error ? error.message : String(error) };
    }
}

// Run the test
testLogging().then(result => {
    console.log(JSON.stringify(result, null, 2));
}).catch(error => {
    console.log(JSON.stringify({ error: error.message }, null, 2));
});