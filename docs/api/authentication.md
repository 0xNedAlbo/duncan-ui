# Authentication API

## Overview

The DUNCAN platform provides dual authentication methods:
- **Session-based authentication** for web interface and interactive use
- **API key authentication** for programmatic access and integrations

All API endpoints require authentication except:
- `/api/auth/*` (registration, login)
- `/api/health` (system health check)

## Authentication Methods

### Session Authentication

Used for web applications and interactive API exploration. Creates a secure HTTP-only cookie.

#### Headers Required
```
Content-Type: application/json
```

#### Cookie Management
- **Secure**: HTTPS only in production
- **HttpOnly**: Not accessible via JavaScript
- **SameSite**: CSRF protection
- **Domain**: Scoped to your domain

### API Key Authentication

Used for server-to-server communication and programmatic access.

#### Headers Required
```
Authorization: Bearer duncan_[env]_[key]
Content-Type: application/json
```

#### API Key Format
- **Pattern**: `duncan_[environment]_[random]`
- **Example**: `duncan_prod_abc123def456789`
- **Scope**: Can be limited to specific operations

## Endpoints

### POST /api/auth/register

Create a new user account.

#### Request
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "name": "User Name"
}
```

#### Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address |
| password | string | Yes | Minimum 6 characters |
| name | string | No | Display name |

#### Response
```json
{
  "success": true,
  "message": "Benutzer erfolgreich erstellt",
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "User Name",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses
```json
// 400 - Missing fields
{
  "success": false,
  "error": "Email und Passwort sind erforderlich"
}

// 400 - User already exists
{
  "success": false,
  "error": "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits"
}

// 500 - Server error
{
  "success": false,
  "error": "Ein Fehler ist aufgetreten"
}
```

### POST /api/auth/login

Authenticate user and create session (handled by NextAuth).

#### Request
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

#### Response
Session cookie is set automatically. Check application session state for authentication status.

### GET /api/auth/api-keys

List user's API keys. **Requires session authentication only** (not API key auth).

#### Request
```http
GET /api/auth/api-keys
Cookie: session_cookie_here
```

#### Response
```json
{
  "apiKeys": [
    {
      "id": "key_abc123",
      "name": "Production API Key",
      "prefix": "duncan_prod_abc123",
      "scopes": ["positions:read", "positions:write"],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "lastUsedAt": "2024-01-15T12:00:00.000Z",
      "expiresAt": null
    }
  ]
}
```

#### Notes
- **Full API key value is never returned** after creation
- Only prefix is shown for identification
- Last used timestamp helps track usage

### POST /api/auth/api-keys

Create a new API key. **Requires session authentication only**.

#### Request
```http
POST /api/auth/api-keys
Content-Type: application/json
Cookie: session_cookie_here

{
  "name": "My Integration Key",
  "scopes": ["positions:read"]
}
```

#### Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Descriptive name for the key |
| scopes | string[] | No | Array of permission scopes |

#### Available Scopes
- `positions:read` - Read position data
- `positions:write` - Import and modify positions
- `user:read` - Read user profile
- `user:write` - Modify user settings

#### Response
```json
{
  "id": "key_abc123",
  "name": "My Integration Key",
  "key": "duncan_prod_abc123def456789ghi",
  "prefix": "duncan_prod_abc123",
  "scopes": ["positions:read"],
  "message": "API key created successfully. Save this key securely - it won't be shown again."
}
```

#### Important Notes
- **Save the full key immediately** - it won't be shown again
- Key is only displayed once for security
- Store securely in your application configuration

#### Error Responses
```json
// 400 - Invalid name
{
  "success": false,
  "error": "Name is required and must be a string"
}

// 400 - Invalid scopes
{
  "success": false,
  "error": "Scopes must be an array of strings"
}

// 403 - Wrong auth method
{
  "success": false,
  "error": "Session authentication required for API key management"
}
```

### DELETE /api/auth/api-keys

Revoke an API key. **Requires session authentication only**.

#### Request
```http
DELETE /api/auth/api-keys?keyId=key_abc123
Cookie: session_cookie_here
```

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| keyId | string | Yes | ID of the key to revoke |

#### Response
```json
{
  "message": "API key revoked successfully"
}
```

#### Error Responses
```json
// 400 - Missing keyId
{
  "success": false,
  "error": "keyId parameter is required"
}

// 404 - Key not found
{
  "success": false,
  "error": "API key not found or already revoked"
}
```

## Usage Examples

### Session-based Flow
```bash
# 1. Register user
curl -X POST /api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123", "name": "Test User"}' \
  -c cookies.txt

# 2. Login (handled by NextAuth)
# Visit /api/auth/signin in browser or use NextAuth.js client

# 3. Use session for API calls
curl -X GET /api/positions/uniswapv3/list \
  -b cookies.txt
```

### API Key Flow
```bash
# 1. Create API key (requires session)
curl -X POST /api/auth/api-keys \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Key", "scopes": ["positions:read"]}' \
  -b cookies.txt

# 2. Use API key for calls
curl -X GET /api/positions/uniswapv3/list \
  -H "Authorization: Bearer duncan_prod_your_key_here"
```

### API Key Management
```bash
# List existing keys
curl -X GET /api/auth/api-keys \
  -b cookies.txt

# Revoke a key
curl -X DELETE "/api/auth/api-keys?keyId=key_abc123" \
  -b cookies.txt
```

## Security Best Practices

### API Key Security
- **Never log API keys** in application logs
- **Store in environment variables** or secure configuration
- **Use different keys** for different environments
- **Rotate keys regularly** (recommended: every 90 days)
- **Revoke unused keys** immediately

### Session Security
- **HTTPS only** in production
- **Secure cookie settings** are enforced
- **Session expiration** follows NextAuth.js configuration
- **CSRF protection** via SameSite cookies

### General Security
- **Rate limiting** applies to all authentication methods
- **Failed login attempts** are monitored
- **IP-based restrictions** can be configured
- **Audit logging** tracks all authentication events

## Error Handling

### Authentication Errors
All protected endpoints return consistent error responses:

```json
// 401 - No authentication
{
  "success": false,
  "error": "Unauthorized - Please sign in",
  "meta": {
    "requestedAt": "2024-01-15T10:30:00.000Z"
  }
}

// 403 - Wrong authentication method
{
  "success": false,
  "error": "Session authentication required for API key management",
  "meta": {
    "requestedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Rate Limiting
When rate limits are exceeded:

```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "meta": {
    "requestedAt": "2024-01-15T10:30:00.000Z",
    "retryAfter": 3600
  }
}
```

## Integration Examples

### JavaScript/TypeScript
```typescript
// API Key authentication
const response = await fetch('/api/positions/uniswapv3/list', {
  headers: {
    'Authorization': `Bearer ${process.env.DUNCAN_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Session authentication (browser)
const response = await fetch('/api/positions/uniswapv3/list', {
  credentials: 'include', // Include cookies
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### Python
```python
import requests

# API Key authentication
headers = {
    'Authorization': f'Bearer {api_key}',
    'Content-Type': 'application/json'
}

response = requests.get(
    'https://your-domain.com/api/positions/uniswapv3/list',
    headers=headers
)
```

### cURL Scripts
```bash
#!/bin/bash
API_KEY="duncan_prod_your_key_here"
BASE_URL="https://your-domain.com/api"

# Function to make authenticated requests
api_call() {
  curl -X "$1" "$BASE_URL$2" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    "${@:3}"
}

# Usage
api_call GET "/positions/uniswapv3/list"
```