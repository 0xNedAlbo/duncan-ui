# Structured Logging Framework

A comprehensive logging framework built on Pino for the Duncan application, supporting service filtering, tag-based organization, and debug log muting.

## Quick Start

### Basic Service Logging

```typescript
import { createServiceLogger } from '@/lib/logging/loggerFactory';

class MyService {
    private logger = createServiceLogger('MyService');

    async doSomething(id: string) {
        this.logger.debug({ id }, 'Starting operation');

        try {
            const result = await performOperation(id);
            this.logger.info({ id, result }, 'Operation completed');
            return result;
        } catch (error) {
            this.logger.error({ id, error: error.message }, 'Operation failed');
            throw error;
        }
    }
}
```

### Operation Context Logging

```typescript
import { createOperationLogger } from '@/lib/logging/loggerFactory';

async function importPosition(nftId: string, chain: string) {
    const logger = createOperationLogger('PositionImportService', 'importNFT', {
        nftId,
        chain,
        correlationId: generateCorrelationId()
    });

    logger.debug('Starting NFT import');
    // ... operation logic
    logger.info({ positionId: result.id }, 'NFT import completed');
}
```

## Environment Configuration

Control logging behavior through environment variables:

### Log Levels
```bash
# Set overall log level
LOG_LEVEL=debug          # development default
LOG_LEVEL=info           # production default
LOG_LEVEL=silent         # test default

# Environment-based defaults
NODE_ENV=development     # Uses debug level
NODE_ENV=production      # Uses info level
NODE_ENV=test            # Uses silent level
```

### Service Filtering
```bash
# Only log from specific services
LOG_SERVICE_FILTER=PositionImport,EtherscanEvent

# Log from services containing specific keywords
LOG_SERVICE_FILTER=Position,Etherscan
```

### Debug Control
```bash
# Mute all debug logs globally
LOG_MUTE_DEBUG=true

# Pretty print logs in development
LOG_PRETTY=true          # development default
LOG_PRETTY=false         # production default
```

## Available Services

Current services with structured logging:

- `PositionLedgerService` - Position event syncing and ledger operations
- `EtherscanEventService` - Blockchain event fetching via Etherscan API
- `PositionImportService` - NFT position import operations
- `AuthUserService` - User authentication and validation
- `WithAuthService` - API route authentication wrapper

## Log Structure

All logs use structured JSON format with consistent fields:

```json
{
  "time": "2025-01-17T10:30:00.000Z",
  "level": 20,
  "service": "PositionImportService",
  "operation": "importNFT",
  "nftId": "123456",
  "chain": "ethereum",
  "correlationId": "1234567890-abc123",
  "msg": "Starting NFT import"
}
```

## Runtime Control

Dynamically control logging during development:

```typescript
import { LoggerControl } from '@/lib/logging/loggerFactory';

// Set global log level
LoggerControl.setLogLevel('debug');

// Mute debug logs
LoggerControl.setMuteDebug(true);

// View registered services
console.log(LoggerControl.getServices());
```

## Log Patterns

Use predefined patterns for common operations:

```typescript
import { LogPatterns } from '@/lib/logging/loggerFactory';

const logger = createServiceLogger('MyService');

// Method entry/exit
LogPatterns.methodEntry(logger, 'processData', { userId, dataType });
LogPatterns.methodExit(logger, 'processData', { result });
LogPatterns.methodError(logger, 'processData', error, { userId });

// External API calls
LogPatterns.externalCall(logger, 'etherscan', '/api/logs', { fromBlock, toBlock });

// Database operations
LogPatterns.dbOperation(logger, 'SELECT', 'positions', { userId, filters });
```

## Production Recommendations

- **Always use structured logging**: Pass objects with meaningful field names
- **Include correlation IDs**: For tracking requests across services
- **Avoid sensitive data**: Never log passwords, API keys, or personal data
- **Use appropriate levels**: debug for detailed tracing, info for important events, error for failures
- **Filter by service**: Use `LOG_SERVICE_FILTER` to focus on specific components during debugging

## Examples

### Environment Setup for Development
```bash
NODE_ENV=development
LOG_LEVEL=debug
LOG_SERVICE_FILTER=PositionImport,PositionLedger
LOG_MUTE_DEBUG=false
```

### Environment Setup for Production
```bash
NODE_ENV=production
LOG_LEVEL=info
LOG_MUTE_DEBUG=true
```

### Debugging Specific Import Issues
```bash
LOG_SERVICE_FILTER=PositionImport,EtherscanEvent
LOG_LEVEL=debug
```

This framework ensures consistent, filterable, and structured logging across the entire Duncan application while maintaining high performance and flexibility.