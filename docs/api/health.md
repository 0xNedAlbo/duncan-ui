# Health Check API

System health and status monitoring endpoint.

## Endpoint

```
GET /api/health
```

## Authentication

**No authentication required** - This is a public endpoint.

## Response Format

### Success Response (200)

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T12:35:00.000Z",
  "requestId": "req_abc123def456",
  "environment": "production"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| status | string | System health status (always "healthy") |
| timestamp | string | ISO timestamp of the health check |
| requestId | string | Unique request identifier for tracing |
| environment | string | Current environment (development, production) |

## Usage Examples

### Basic Request
```bash
curl -X GET "/api/health"
```

### With Response Parsing
```bash
#!/bin/bash
response=$(curl -s "/api/health")
status=$(echo $response | jq -r '.status')

if [ "$status" = "healthy" ]; then
  echo "✅ API is healthy"
  echo "Environment: $(echo $response | jq -r '.environment')"
  echo "Timestamp: $(echo $response | jq -r '.timestamp')"
else
  echo "❌ API health check failed"
  exit 1
fi
```

### Monitoring Script
```bash
#!/bin/bash
# Simple monitoring script
API_URL="https://your-domain.com/api/health"
LOG_FILE="/var/log/midcurve-health.log"

while true; do
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

  if response=$(curl -s --max-time 10 "$API_URL"); then
    status=$(echo $response | jq -r '.status // "unknown"')

    if [ "$status" = "healthy" ]; then
      echo "$timestamp - HEALTHY" >> $LOG_FILE
    else
      echo "$timestamp - UNHEALTHY - Status: $status" >> $LOG_FILE
    fi
  else
    echo "$timestamp - UNREACHABLE" >> $LOG_FILE
  fi

  sleep 60  # Check every minute
done
```

## JavaScript Examples

### Basic Fetch
```typescript
async function checkHealth() {
  try {
    const response = await fetch('/api/health');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const health = await response.json();
    return health;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
}

// Usage
const health = await checkHealth();
console.log(`API is ${health.status} (${health.environment})`);
```

### Monitoring with Retry Logic
```typescript
interface HealthStatus {
  status: string;
  timestamp: string;
  requestId: string;
  environment: string;
}

class HealthMonitor {
  private interval: number;
  private maxRetries: number;
  private onHealthChange?: (healthy: boolean) => void;
  private isHealthy: boolean = true;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(
    interval: number = 60000, // 1 minute
    maxRetries: number = 3,
    onHealthChange?: (healthy: boolean) => void
  ) {
    this.interval = interval;
    this.maxRetries = maxRetries;
    this.onHealthChange = onHealthChange;
  }

  async checkHealth(): Promise<HealthStatus | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const health: HealthStatus = await response.json();

        if (health.status === 'healthy') {
          this.setHealthy(true);
          return health;
        } else {
          throw new Error(`Unhealthy status: ${health.status}`);
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`Health check attempt ${attempt}/${this.maxRetries} failed:`, error);

        if (attempt < this.maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    this.setHealthy(false);
    console.error('All health check attempts failed:', lastError);
    return null;
  }

  private setHealthy(healthy: boolean) {
    if (this.isHealthy !== healthy) {
      this.isHealthy = healthy;
      this.onHealthChange?.(healthy);
    }
  }

  startMonitoring() {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    // Initial check
    this.checkHealth();

    // Set up periodic checks
    this.monitoringInterval = setInterval(() => {
      this.checkHealth();
    }, this.interval);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  getStatus(): boolean {
    return this.isHealthy;
  }
}

// Usage
const monitor = new HealthMonitor(
  30000, // Check every 30 seconds
  3,     // Retry 3 times
  (healthy) => {
    if (healthy) {
      console.log('✅ API is back online');
    } else {
      console.log('❌ API is offline');
    }
  }
);

monitor.startMonitoring();
```

### React Health Indicator
```typescript
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

function useHealthCheck(interval: number = 60000) {
  return useQuery({
    queryKey: ['health'],
    queryFn: checkHealth,
    refetchInterval: interval,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

function HealthIndicator() {
  const { data, error, isError, isFetching } = useHealthCheck(30000);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  useEffect(() => {
    if (data) {
      setLastSeen(new Date());
    }
  }, [data]);

  const getStatusColor = () => {
    if (isError) return 'red';
    if (isFetching) return 'orange';
    return 'green';
  };

  const getStatusText = () => {
    if (isError) return 'Offline';
    if (isFetching) return 'Checking...';
    return 'Online';
  };

  return (
    <div className="health-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getStatusColor()
        }}
      />

      <span style={{ fontSize: '14px', color: '#666' }}>
        API: {getStatusText()}
      </span>

      {data && (
        <span style={{ fontSize: '12px', color: '#999' }}>
          ({data.environment})
        </span>
      )}

      {isError && lastSeen && (
        <span style={{ fontSize: '12px', color: '#999' }}>
          Last seen: {lastSeen.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
```

### Uptime Monitoring
```typescript
class UptimeTracker {
  private checks: { timestamp: Date; healthy: boolean; responseTime: number }[] = [];
  private maxHistory: number = 1000;

  async recordCheck(): Promise<void> {
    const startTime = Date.now();
    let healthy = false;

    try {
      const health = await checkHealth();
      healthy = health.status === 'healthy';
    } catch (error) {
      healthy = false;
    }

    const responseTime = Date.now() - startTime;

    this.checks.push({
      timestamp: new Date(),
      healthy,
      responseTime
    });

    // Trim history to max size
    if (this.checks.length > this.maxHistory) {
      this.checks = this.checks.slice(-this.maxHistory);
    }
  }

  getUptimeStats(hours: number = 24): {
    uptime: number;
    totalChecks: number;
    successfulChecks: number;
    averageResponseTime: number;
    lastDowntime?: Date;
  } {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentChecks = this.checks.filter(check => check.timestamp >= cutoff);

    if (recentChecks.length === 0) {
      return {
        uptime: 0,
        totalChecks: 0,
        successfulChecks: 0,
        averageResponseTime: 0
      };
    }

    const successfulChecks = recentChecks.filter(check => check.healthy).length;
    const uptime = (successfulChecks / recentChecks.length) * 100;
    const averageResponseTime = recentChecks.reduce((sum, check) => sum + check.responseTime, 0) / recentChecks.length;
    const lastFailure = recentChecks.filter(check => !check.healthy).pop();

    return {
      uptime,
      totalChecks: recentChecks.length,
      successfulChecks,
      averageResponseTime,
      lastDowntime: lastFailure?.timestamp
    };
  }

  getRecentHistory(count: number = 50): { timestamp: Date; healthy: boolean; responseTime: number }[] {
    return this.checks.slice(-count);
  }
}

// Usage
const uptimeTracker = new UptimeTracker();

// Record checks every minute
setInterval(() => {
  uptimeTracker.recordCheck();
}, 60000);

// Get stats
const stats = uptimeTracker.getUptimeStats(24); // Last 24 hours
console.log(`Uptime: ${stats.uptime.toFixed(2)}%`);
console.log(`Average response time: ${stats.averageResponseTime.toFixed(0)}ms`);
```

## Error Scenarios

The health endpoint is designed to always return 200 OK with a healthy status. If you receive any other response, it indicates a system issue:

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

This would indicate a serious system problem.

### Network Errors
- **Connection timeout**: Network connectivity issues
- **DNS resolution failure**: Domain configuration problems
- **SSL/TLS errors**: Certificate issues

## Monitoring Integration

### Uptime Monitoring Services
```bash
# Pingdom, UptimeRobot, etc.
URL: https://your-domain.com/api/health
Method: GET
Expected Response: 200 OK
Expected Content: "healthy"
Check Interval: 1 minute
```

### Prometheus Metrics
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'midcurve-api'
    static_configs:
      - targets: ['your-domain.com']
    metrics_path: /api/health
    scrape_interval: 30s
```

### Grafana Dashboard
Create alerts based on:
- Response time > 5 seconds
- Availability < 99%
- Consecutive failures > 3

## Load Balancer Health Checks

For load balancers and container orchestration:

```yaml
# Kubernetes liveness probe
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

# Kubernetes readiness probe
readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

## Rate Limiting

The health endpoint has generous rate limits:
- **Per IP**: 600 requests per minute (10 per second)
- **Global**: No limit (public endpoint)

This allows for frequent monitoring without impacting system performance.

## Performance Notes

- **Response time**: Typically < 50ms
- **Resource usage**: Minimal (simple JSON response)
- **Caching**: No caching (always fresh status)
- **Dependencies**: No external service dependencies