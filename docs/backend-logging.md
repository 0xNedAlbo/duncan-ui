# Backend Logging Architecture

Comprehensive guide to backend logging in the DUNCAN Uniswap V3 Risk Management Platform.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Three-Layer Architecture](#three-layer-architecture)
- [Configuration](#configuration)
- [Usage Patterns](#usage-patterns)
- [Log Structure](#log-structure)
- [Production Guidelines](#production-guidelines)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

---

## Architecture Overview

DUNCAN uses **Pino** as the logging framework with a **three-layered architecture**:

1. **Base Layer** - Core Pino logger with environment-based configuration
2. **Service Layer** - Service-specific child loggers with filtering capabilities
3. **HTTP Layer** - API route request/response logging with authentication context

**Key Principle:** Services are silent by default. All logging happens at the API layer with structured context.

---

## Three-Layer Architecture

### 1. Base Layer - Core Logger Configuration

**File:** `src/lib/api/logger.ts`

**Purpose:** Foundation Pino logger instance with environment-aware configuration.

**Features:**
- Environment-based log levels:
  - `development`: `debug`
  - `production`: `info`
  - `test`: `silent`
- JSON output to stdout (Next.js compatible)
- No transport layer (pino-pretty incompatible with Next.js)

**Environment Variables:**
```bash
NODE_ENV=production          # Controls default log level
LOG_LEVEL=info              # Override default log level
LOG_SERVICE_FILTER=Service1,Service2  # Filter by service names
LOG_MUTE_DEBUG=true         # Globally mute debug logs
```

**Code:**
```typescript
import { logger } from '@/lib/api/logger';

logger.info({ userId: '123' }, 'User logged in');
logger.debug({ query: '...' }, 'Database query');
logger.error({ error: err.message }, 'Operation failed');
```

---

### 2. Service Layer - Service-Specific Loggers

**File:** `src/lib/logging/loggerFactory.ts`

**Purpose:** Create child loggers for services with automatic filtering and tagging.

#### `createServiceLogger(serviceName)`

Creates a logger tagged with service name:

```typescript
import { createServiceLogger } from '@/lib/logging/loggerFactory';

const logger = createServiceLogger('PositionImportService');

logger.debug({ nftId: '123' }, 'Starting import');
logger.info({ positionId: 'pos_123' }, 'Import completed');
logger.error({ error: err.message }, 'Import failed');
```

**Output:**
```json
{
  "time": "2025-01-17T10:30:00.000Z",
  "level": 20,
  "service": "PositionImportService",
  "nftId": "123",
  "msg": "Starting import"
}
```

#### `createOperationLogger(serviceName, operation, context)`

Creates logger with operation context and correlation ID:

```typescript
import { createOperationLogger, generateCorrelationId } from '@/lib/logging/loggerFactory';

const logger = createOperationLogger('PositionImportService', 'importNFT', {
  nftId: '123',
  chain: 'ethereum',
  correlationId: generateCorrelationId()
});

logger.debug('Fetching position data');
logger.info({ result: 'success' }, 'Position imported');
```

#### Service Filtering

The **LoggerRegistry** manages per-service log levels:

- Services not in `LOG_SERVICE_FILTER` are set to `silent`
- `LOG_MUTE_DEBUG=true` downgrades all `debug` → `info`
- Filter matching is case-insensitive and substring-based

**Examples:**
```bash
# Only log from PositionImportService and EtherscanClient
LOG_SERVICE_FILTER=PositionImport,Etherscan

# Log from all services containing "Position"
LOG_SERVICE_FILTER=Position
```

#### Log Patterns

Pre-defined helpers for common operations:

```typescript
import { LogPatterns, createServiceLogger } from '@/lib/logging/loggerFactory';

const logger = createServiceLogger('MyService');

// Method entry/exit
LogPatterns.methodEntry(logger, 'processData', { userId: '123', dataType: 'position' });
LogPatterns.methodExit(logger, 'processData', { result: 'success' });
LogPatterns.methodError(logger, 'processData', error, { userId: '123' });

// External API calls
LogPatterns.externalCall(logger, 'etherscan', '/api/logs', { fromBlock: 1000, toBlock: 2000 });

// Database operations
LogPatterns.dbOperation(logger, 'SELECT', 'positions', { userId: '123', filters: {...} });
```

---

### 3. HTTP Layer - API Route Logging

#### HTTP Request/Response Logging

**File:** `src/lib/api/httpLogger.ts`

**Function:** `beginRequestLog(req, authUser?)`

Creates request-specific logger with:
- Unique request ID (UUID or from `x-request-id` header)
- Access log function (Apache Combined Log Format)
- Child logger with request context

**What it logs:**
```json
{
  "time": "2025-01-17T10:30:01.234Z",
  "level": 30,
  "reqId": "a1b2c3d4-e5f6-...",
  "type": "access",
  "method": "POST",
  "url": "/api/positions/uniswapv3/import-nft",
  "statusCode": 200,
  "responseTime": 1234,
  "userId": "user_123",
  "username": "john@example.com",
  "authMethod": "session",
  "msg": "203.0.113.1 - john@example.com \"POST /api/positions/uniswapv3/import-nft HTTP/1.1\" 200 - \"-\" \"Mozilla/5.0...\" reqId=a1b2c3d4-... 1234ms"
}
```

#### API Route Wrappers

**File:** `src/lib/api/withLogging.ts`

**Function:** `withLogging(handler, authUser?)`

Wraps API route handlers with automatic logging:

```typescript
import { withLogging } from '@/lib/api/withLogging';

export const GET = withLogging(
  async (request, { log, reqId }) => {
    log.debug({ query: 'data' }, 'Processing request');

    // Your handler logic

    return NextResponse.json({ success: true });
  }
);
```

**Logs automatically:**
1. **Incoming request** (DEBUG):
   ```json
   {
     "level": "debug",
     "method": "POST",
     "url": "/api/positions/uniswapv3/import-nft",
     "headers": {...},
     "msg": "Incoming API request"
   }
   ```

2. **Success response** (DEBUG + INFO):
   ```json
   {
     "level": "debug",
     "statusCode": 200,
     "msg": "API request completed successfully"
   }
   ```
   Plus access log at INFO level

3. **Error response** (DEBUG + INFO):
   ```json
   {
     "level": "debug",
     "error": "<full stack trace>",
     "msg": "Service error in API handler"
   }
   ```
   Plus access log with status 500

**File:** `src/lib/api/withAuth.ts`

**Functions:**
- `withAuth(handler)` - Authentication only
- `withAuthAndLogging(handler)` - Combined auth + logging (recommended)

**Usage:**
```typescript
import { withAuthAndLogging } from '@/lib/api/withAuth';

export const POST = withAuthAndLogging(
  async (request, { user, log }) => {
    // 'user' contains authenticated user info
    // 'log' is request-scoped logger

    log.debug({ userId: user.userId }, 'Processing authenticated request');

    // Your handler logic

    return NextResponse.json({ success: true });
  }
);
```

**Logs automatically:**
- Authentication errors (ERROR level)
- Unauthenticated requests (WARN level)
- Authenticated request details (DEBUG level):
  ```json
  {
    "userId": "user_123",
    "authMethod": "session",
    "msg": "Authenticated request"
  }
  ```

---

## Configuration

### Environment Variables

| Variable | Default | Description | Example |
|----------|---------|-------------|---------|
| `NODE_ENV` | `development` | Environment name, controls default log level | `production` |
| `LOG_LEVEL` | `debug` (dev) / `info` (prod) | Override log level | `debug`, `info`, `warn`, `error`, `silent` |
| `LOG_SERVICE_FILTER` | - | Comma-separated service names to include | `PositionImport,Etherscan` |
| `LOG_MUTE_DEBUG` | `false` | Mute all debug logs globally | `true` / `false` |

### Log Levels

| Level | Numeric | Usage | Examples |
|-------|---------|-------|----------|
| `silent` | - | No logging | Testing |
| `error` | 50 | Critical failures | Service exceptions, DB failures |
| `warn` | 40 | Warning conditions | Unauthenticated requests |
| `info` | 30 | Important events | Access logs, successful operations |
| `debug` | 20 | Detailed tracing | Request/response details, stack traces |

**Important:** Error stack traces are logged at **DEBUG level**, not ERROR. This keeps production INFO logs clean while enabling full diagnostics when needed.

### Configuration Examples

#### Development
```bash
NODE_ENV=development
LOG_LEVEL=debug
LOG_SERVICE_FILTER=  # Empty = log all services
LOG_MUTE_DEBUG=false
```

#### Production
```bash
NODE_ENV=production
LOG_LEVEL=info
LOG_MUTE_DEBUG=true
```

#### Production Debugging (Specific Service)
```bash
NODE_ENV=production
LOG_LEVEL=debug
LOG_SERVICE_FILTER=PositionImport,EtherscanClient
LOG_MUTE_DEBUG=false
```

---

## Usage Patterns

### API Routes (Recommended Pattern)

All protected API routes should use `withAuthAndLogging()`:

```typescript
// src/app/api/positions/uniswapv3/import-nft/route.ts
import { withAuthAndLogging } from '@/lib/api/withAuth';
import { NextRequest, NextResponse } from 'next/server';

export const POST = withAuthAndLogging(
  async (request: NextRequest, { user, log }) => {
    try {
      // Parse request
      const body = await request.json();

      log.debug({ nftId: body.nftId, chain: body.chain }, 'Starting import');

      // Call service layer (services are silent)
      const result = await positionImportService.importNFT(user.userId, body.nftId, body.chain);

      log.info({ positionId: result.id }, 'Import completed successfully');

      return NextResponse.json({ success: true, data: result });
    } catch (error) {
      // Error is automatically logged by withAuthAndLogging wrapper
      // Just return error response
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }
);
```

### Service Layer (Limited Logging)

**Services are silent by default** - they throw errors, never log directly.

**Exception:** Use service loggers for critical debugging points only:

```typescript
// src/services/etherscan/etherscanClient.ts
import { createServiceLogger } from '@/lib/logging/loggerFactory';

const logger = createServiceLogger('EtherscanClient');

export class EtherscanClient {
  private async doFetch<T>(url: string): Promise<T> {
    // ...

    // Log critical debugging point (rate limiting)
    if (this.isEtherscanRateLimited(data)) {
      logger.debug(
        {
          status: data.status,
          message: data.message,
          result: data.result,
        },
        'Etherscan API rate limit detected, will retry with backoff'
      );
      // Throw error for retry logic
      throw error;
    }

    return data;
  }
}
```

**Services that currently have logging:**
- `EtherscanClient` - Rate limit detection
- `PositionLookupService` - Position discovery debugging
- `PositionAprService` - APR calculation debugging
- `PositionLedgerService` - Ledger operation debugging
- `EtherscanEventService` - Event fetching debugging

---

## Log Structure

All logs use **structured JSON format**:

```json
{
  "time": "2025-01-17T10:30:00.000Z",
  "level": 20,
  "reqId": "a1b2c3d4-e5f6-1234-5678-90abcdef1234",
  "service": "PositionImportService",
  "operation": "importNFT",
  "userId": "user_123",
  "nftId": "123456",
  "chain": "ethereum",
  "correlationId": "1705489800000-abc123xyz",
  "msg": "Starting NFT import"
}
```

### Standard Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `time` | ISO 8601 | Timestamp | `2025-01-17T10:30:00.000Z` |
| `level` | number | Log level numeric value | `20` (debug), `30` (info), `50` (error) |
| `reqId` | UUID | Request correlation ID | `a1b2c3d4-e5f6-...` |
| `service` | string | Service name | `PositionImportService` |
| `operation` | string | Operation name | `importNFT` |
| `userId` | string | Authenticated user ID | `user_123` |
| `username` | string | Authenticated username | `john@example.com` |
| `authMethod` | string | Authentication method | `session` / `apikey` |
| `msg` | string | Human-readable message | `Starting NFT import` |

### Access Log Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"access"` for access logs |
| `method` | string | HTTP method (GET, POST, etc.) |
| `url` | string | Request path + query string |
| `statusCode` | number | HTTP response status code |
| `responseTime` | number | Request duration in milliseconds |

---

## Production Guidelines

### ✅ Best Practices

1. **Always use structured logging:**
   ```typescript
   // ✅ Good
   log.info({ userId: user.id, action: 'import' }, 'Position imported');

   // ❌ Bad
   log.info(`User ${user.id} imported position`);
   ```

2. **Include correlation IDs for request tracing:**
   ```typescript
   const logger = createOperationLogger('MyService', 'operation', {
     correlationId: generateCorrelationId()
   });
   ```

3. **Use appropriate log levels:**
   - `debug`: Detailed tracing, stack traces
   - `info`: Important events, access logs
   - `warn`: Warning conditions
   - `error`: Critical failures

4. **Never log sensitive data:**
   - ❌ Passwords, API keys, private keys
   - ❌ Full credit card numbers
   - ❌ Personal identifiable information (PII)
   - ✅ User IDs, request IDs, sanitized data

5. **Let services throw, let APIs log:**
   - Services throw errors with context
   - API layer catches and logs with full stack trace
   - Centralizes logging at API boundary

### ⚠️ Anti-Patterns

```typescript
// ❌ Don't log in service layer
class MyService {
  async process() {
    logger.info('Processing...'); // Anti-pattern!
    throw new Error('Failed');
  }
}

// ✅ Do log in API layer
export const POST = withAuthAndLogging(async (req, { log }) => {
  try {
    await myService.process(); // Service is silent
  } catch (error) {
    // Logged automatically by wrapper with full context
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
```

### Production Monitoring

**View all requests:**
```bash
LOG_LEVEL=info  # Only access logs + important events
```

**Debug specific service:**
```bash
LOG_LEVEL=debug
LOG_SERVICE_FILTER=EtherscanClient,PositionImport
```

**Troubleshoot errors:**
```bash
LOG_LEVEL=debug  # Enable stack traces
```

**Parse logs programmatically:**
```bash
# Filter errors only
cat logs.json | jq 'select(.level == 50)'

# Filter failed requests
cat logs.json | jq 'select(.statusCode >= 400)'

# Filter specific service
cat logs.json | jq 'select(.service == "PositionImportService")'

# Filter by request ID
cat logs.json | jq 'select(.reqId == "a1b2c3d4-...")'
```

---

## Troubleshooting

### Common Scenarios

#### 1. Too Many Logs in Production

**Problem:** Production logs are too verbose.

**Solution:**
```bash
LOG_LEVEL=info
LOG_MUTE_DEBUG=true
```

#### 2. Need to Debug Specific Feature

**Problem:** Need detailed logs for position import without flooding logs.

**Solution:**
```bash
LOG_LEVEL=debug
LOG_SERVICE_FILTER=PositionImport,PositionLookup
```

#### 3. Track Request Across Services

**Problem:** Need to trace a single request through multiple services.

**Solution:** Use the `reqId` field:
```bash
cat logs.json | jq 'select(.reqId == "a1b2c3d4-e5f6-...")'
```

The `reqId` is:
- Generated per request (UUID)
- Included in all logs within that request
- Returned in `x-request-id` response header
- Preserved across service calls

#### 4. Etherscan Rate Limiting Issues

**Problem:** Need to see when Etherscan rate limits are hit.

**Solution:**
```bash
LOG_LEVEL=debug
LOG_SERVICE_FILTER=EtherscanClient
```

Look for:
```json
{
  "service": "EtherscanClient",
  "msg": "Etherscan API rate limit detected, will retry with backoff"
}
```

#### 5. Service Not Logging

**Problem:** Logs from `MyService` are missing.

**Solution:** Check service filter:
```bash
# Remove filter to see all services
unset LOG_SERVICE_FILTER

# Or add service to filter
LOG_SERVICE_FILTER=MyService
```

---

## API Reference

### Base Logger

**File:** `src/lib/api/logger.ts`

```typescript
import { logger } from '@/lib/api/logger';

// Log methods
logger.debug({ key: 'value' }, 'Debug message');
logger.info({ key: 'value' }, 'Info message');
logger.warn({ key: 'value' }, 'Warning message');
logger.error({ key: 'value' }, 'Error message');

// Create child logger
const childLogger = logger.child({ service: 'MyService' });
```

### Service Logger Factory

**File:** `src/lib/logging/loggerFactory.ts`

```typescript
import {
  createServiceLogger,
  createOperationLogger,
  generateCorrelationId,
  LogPatterns,
  LoggerControl
} from '@/lib/logging/loggerFactory';

// Create service logger
const logger = createServiceLogger('MyService');

// Create operation logger with context
const opLogger = createOperationLogger('MyService', 'myOperation', {
  correlationId: generateCorrelationId(),
  userId: 'user_123'
});

// Log patterns
LogPatterns.methodEntry(logger, 'methodName', { param: 'value' });
LogPatterns.methodExit(logger, 'methodName', { result: 'value' });
LogPatterns.methodError(logger, 'methodName', error, { context: 'value' });
LogPatterns.externalCall(logger, 'apiName', '/endpoint', { params: {} });
LogPatterns.dbOperation(logger, 'SELECT', 'table_name', { filters: {} });

// Runtime control (development only)
LoggerControl.setLogLevel('debug');
LoggerControl.setMuteDebug(true);
LoggerControl.getServices(); // Returns array of registered services
LoggerControl.clear(); // Clear registry (testing only)
```

### HTTP Logging

**File:** `src/lib/api/httpLogger.ts`

```typescript
import { beginRequestLog } from '@/lib/api/httpLogger';

const { reqId, headers, access, log } = beginRequestLog(request, authUser);

// Log request-specific messages
log.debug({ data: 'value' }, 'Processing request');

// Log access line (call at end of request)
access(200); // Status code
```

### API Route Wrappers

**File:** `src/lib/api/withLogging.ts`

```typescript
import { withLogging, logError } from '@/lib/api/withLogging';

export const GET = withLogging(
  async (request, { log, reqId }) => {
    log.debug('Processing');
    return NextResponse.json({ success: true });
  }
);

// Manual error logging
export const POST = withLogging(async (request, { log }) => {
  try {
    // ...
  } catch (error) {
    logError(log, error, { context: 'value' });
    throw error;
  }
});
```

**File:** `src/lib/api/withAuth.ts`

```typescript
import { withAuth, withAuthAndLogging } from '@/lib/api/withAuth';

// Authentication only
export const GET = withAuth(
  async (request, { user }) => {
    // user.userId, user.username, user.authMethod
    return NextResponse.json({ success: true });
  }
);

// Authentication + Logging (recommended)
export const POST = withAuthAndLogging(
  async (request, { user, log }) => {
    log.debug({ userId: user.userId }, 'Processing');
    return NextResponse.json({ success: true });
  }
);
```

---

## Runtime Control

Dynamically control logging during development:

```typescript
import { LoggerControl } from '@/lib/logging/loggerFactory';

// Set global log level
LoggerControl.setLogLevel('debug');
LoggerControl.setLogLevel('info');

// Mute/unmute debug logs
LoggerControl.setMuteDebug(true);
LoggerControl.setMuteDebug(false);

// View registered services
const services = LoggerControl.getServices();
console.log(services); // ['PositionImportService', 'EtherscanClient', ...]

// Clear registry (testing only)
LoggerControl.clear();
```

---

## Summary

The DUNCAN logging architecture provides:

✅ **Structured JSON logging** - Easy to parse and analyze
✅ **Three-layer architecture** - Clean separation of concerns
✅ **Environment-aware** - Automatic configuration per environment
✅ **Request correlation** - Track requests across services
✅ **Service filtering** - Focus on specific components
✅ **Production-ready** - Minimal overhead, comprehensive diagnostics
✅ **Authentication context** - Automatic user tracking
✅ **Error diagnostics** - Full stack traces at DEBUG level

This architecture ensures consistent, filterable, and structured logging across the entire DUNCAN application while maintaining high performance and flexibility.
