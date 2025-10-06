# DUNCAN Monorepo Migration Plan

**Date:** October 3, 2025
**Status:** Planning Phase
**Estimated Duration:** 2-3 hours
**Risk Level:** Low

---

## Overview

Transform the current single-package Next.js project into a **pnpm monorepo** with two packages:
- **`packages/web`** - Next.js frontend application (current duncan-ui)
- **`packages/shared`** - Shared utilities, types, business logic, **and Prisma database client**

This structure enables:
- Code reuse across web and future worker/backend packages
- Shared Prisma client accessible to all packages
- Better organization and separation of concerns
- Easier scaling to additional packages (worker, CLI, mobile, etc.)

---

## Final Directory Structure

```
duncan-ui/
├── packages/
│   ├── web/                    # Next.js app
│   │   ├── src/
│   │   │   ├── app/           # Next.js App Router + API routes
│   │   │   ├── components/    # React components
│   │   │   ├── hooks/         # React hooks
│   │   │   └── providers/     # React providers
│   │   ├── public/
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   └── tsconfig.json
│   │
│   └── shared/                 # Shared package
│       ├── src/
│       │   ├── services/      # Business logic services
│       │   ├── lib/           # Utilities, validation, contracts
│       │   ├── config/        # Chain configs, constants
│       │   ├── types/         # Shared TypeScript types
│       │   └── index.ts       # Package exports
│       ├── prisma/            # ⭐ Database schema & migrations
│       │   ├── schema.prisma
│       │   ├── seed.ts
│       │   └── migrations/
│       ├── package.json
│       └── tsconfig.json
│
├── pnpm-workspace.yaml
├── package.json               # Root package.json
├── tsconfig.json              # Root TypeScript config
├── .env                       # Database URL & env vars
├── .gitignore
└── README.md
```

---

## Migration Steps

### 1. Install pnpm (if not already installed)

```bash
npm install -g pnpm
```

### 2. Create Root Configuration Files

#### `pnpm-workspace.yaml`
```yaml
packages:
  - 'packages/*'
```

#### Root `package.json`
```json
{
  "name": "duncan-monorepo",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @duncan/web dev",
    "build": "pnpm -r build",
    "start": "pnpm --filter @duncan/web start",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "db:seed": "pnpm --filter @duncan/shared db:seed",
    "db:migrate": "pnpm --filter @duncan/shared db:migrate",
    "db:push": "pnpm --filter @duncan/shared db:push",
    "db:studio": "pnpm --filter @duncan/shared db:studio"
  },
  "devDependencies": {
    "@types/node": "^20",
    "typescript": "^5"
  }
}
```

#### Root `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@duncan/shared": ["./packages/shared/src"],
      "@duncan/shared/*": ["./packages/shared/src/*"]
    }
  },
  "exclude": ["node_modules", "dist", ".next"]
}
```

### 3. Create `packages/web/` Structure

#### Files to Move from Root to `packages/web/`

**Source code:**
- `src/app/` → `packages/web/src/app/` (Next.js App Router, API routes)
- `src/components/` → `packages/web/src/components/`
- `src/hooks/` → `packages/web/src/hooks/`
- `src/providers/` → `packages/web/src/providers/`
- `src/i18n/` → `packages/web/src/i18n/`
- `src/messages/` → `packages/web/src/messages/`
- `src/store/` → `packages/web/src/store/`

**Static assets:**
- `public/` → `packages/web/public/`

**Configuration files:**
- `next.config.ts` → `packages/web/next.config.ts`
- `eslint.config.mjs` → `packages/web/eslint.config.mjs`
- `postcss.config.mjs` → `packages/web/postcss.config.mjs`
- `next-env.d.ts` → `packages/web/next-env.d.ts`

#### `packages/web/package.json`
```json
{
  "name": "@duncan/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "dev:pretty": "next dev | pino-pretty",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@duncan/shared": "workspace:*",
    "next": "15.5.2",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "@rainbow-me/rainbowkit": "^2.2.8",
    "@tanstack/react-query": "^5.87.1",
    "@tanstack/react-query-devtools": "^5.87.3",
    "next-auth": "^4.24.11",
    "next-intl": "^4.3.6",
    "zustand": "^5.0.8",
    "recharts": "^3.1.2",
    "lucide-react": "^0.542.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.3.1",
    "use-debounce": "^10.0.6",
    "@cowprotocol/widget-lib": "^0.20.0",
    "@cowprotocol/widget-react": "^0.14.0"
  },
  "devDependencies": {
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@tailwindcss/postcss": "^4",
    "@eslint/eslintrc": "^3",
    "eslint": "^9",
    "eslint-config-next": "15.5.2",
    "tailwindcss": "^4",
    "tw-animate-css": "^1.3.8",
    "typescript": "^5"
  }
}
```

#### `packages/web/tsconfig.json`
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "module": "esnext",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@duncan/shared": ["../shared/src"],
      "@duncan/shared/*": ["../shared/src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

#### Update `packages/web/next.config.ts`

Add `transpilePackages` to transpile the shared package:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@duncan/shared'],

  images: {
    domains: [
      'static.alchemyapi.io',
      'assets.coingecko.com',
      'coin-images.coingecko.com',
      'cdn.jsdelivr.net',
      'raw.githubusercontent.com',
      'tokens.1inch.io'
    ],
  },

  webpack: (config, { isServer }) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    if (!isServer) {
      config.externals.push('@node-rs/argon2');
    }

    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
};

export default nextConfig;
```

### 4. Create `packages/shared/` Structure

#### Files to Move from Root to `packages/shared/`

**Source code:**
- `src/services/` → `packages/shared/src/services/`
- `src/lib/` → `packages/shared/src/lib/`
- `src/config/` → `packages/shared/src/config/`
- `src/types/` → `packages/shared/src/types/`

**Database:**
- `prisma/` → `packages/shared/prisma/` ⭐

#### `packages/shared/package.json`
```json
{
  "name": "@duncan/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "db:seed": "tsx prisma/seed.ts",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate",
    "postinstall": "prisma generate",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@prisma/client": "^6.15.0",
    "prisma": "^6.15.0",
    "@auth/prisma-adapter": "^2.10.0",
    "@node-rs/argon2": "^2.0.2",
    "bcryptjs": "^3.0.2",
    "@uniswap/sdk-core": "^7.7.2",
    "@uniswap/v3-sdk": "^3.25.2",
    "viem": "^2.37.3",
    "wagmi": "^2.16.9",
    "pino": "^9.9.5",
    "pino-http": "^10.5.0",
    "uuid": "^13.0.0",
    "jsbi": "^4.3.2",
    "siwe": "^3.0.0",
    "node-fetch": "^3.3.2"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/uuid": "^10.0.0",
    "@types/bcryptjs": "^2.4.6",
    "tsx": "latest",
    "typescript": "^5"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

#### `packages/shared/tsconfig.json`
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "noEmit": true
  },
  "include": ["src/**/*", "prisma/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### Create `packages/shared/src/index.ts`

Export all shared modules:

```typescript
// ============================================
// Services
// ============================================
export * from './services/ServiceFactory';
export * from './services/ClientsFactory';

// Position services
export * from './services/positions/positionService';
export * from './services/positions/positionImportService';
export * from './services/positions/positionLookupService';
export * from './services/positions/positionLedgerService';
export * from './services/positions/positionAprService';
export * from './services/positions/quoteTokenService';

// Pool services
export * from './services/pools/poolService';

// Token services
export * from './services/tokens/tokenService';

// Price services
export * from './services/prices/priceService';

// Etherscan services
export * from './services/etherscan/etherscanClient';
export * from './services/etherscan/etherscanEventService';
export * from './services/etherscan/etherscanBlockInfoService';

// Auth services
export * from './services/auth/apiKeyService';

// EVM services
export * from './services/evm/rpcClients';

// Alchemy services
export * from './services/alchemy/alchemyTokenService';

// Subgraph services
export * from './services/subgraph/subgraphClient';

// Coingecko services
export * from './services/coingecko/coingeckoService';

// ============================================
// Lib - Utilities
// ============================================

// API utilities
export * from './lib/api/logger';
export * from './lib/api/httpLogger';
export * from './lib/api/withLogging';
export * from './lib/api/withAuth';
export * from './lib/api/ApiServiceFactory';

// Auth utilities
export * from './lib/auth/getAuthUser';
export * from './lib/auth/nextAuthOptions';

// Logging
export * from './lib/logging/loggerFactory';

// Validation
export * from './lib/validation/addressChecksum';

// Utils
export * from './lib/utils/evm';
export * from './lib/utils/fraction-format';
export * from './lib/utils/math';
export * from './lib/utils/formatters';
export * from './lib/utils/position-states';
export * from './lib/utils/apr-calculation';
export * from './lib/utils/curve-cache';
export * from './lib/utils/whitelist';
export * from './lib/utils/request-scheduler';
export * from './lib/utils/http-retry';

// Uniswap utilities
export * from './lib/uniswap/priceCalculation';
export * from './lib/uniswap/positionCalculation';

// Contracts
export * from './lib/contracts/nonfungiblePositionManager';
export * from './lib/contracts/uniswapV3Pool';
export * from './lib/contracts/quoter';

// App utilities
export * from './lib/app/apiClient';
export * from './lib/app/apiError';

// ============================================
// Config
// ============================================
export * from './config/chains';

// ============================================
// Types
// ============================================
export * from './types/api';
export * from './types/positions';
export * from './types/pools';
export * from './types/tokens';
```

#### Update `packages/shared/prisma/seed.ts`

Update imports to use `@prisma/client`:

```typescript
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

// Rest of seed.ts remains the same
```

### 5. Update Import Paths in `packages/web/`

#### Import Migration Pattern

Replace all imports in `packages/web/src/` files:

**Before (old imports):**
```typescript
import { PositionService } from '@/services/positions/positionService';
import { getAuthUser } from '@/lib/auth/getAuthUser';
import { SUPPORTED_CHAINS } from '@/config/chains';
import { ApiResponse } from '@/types/api';
```

**After (new imports):**
```typescript
import {
  PositionService,
  getAuthUser,
  SUPPORTED_CHAINS,
  ApiResponse
} from '@duncan/shared';
```

#### Imports that Stay Unchanged

Keep these imports as-is (web-only modules):

```typescript
import { PositionCard } from '@/app-shared/components/positions/PositionCard';
import { usePosition } from '@/hooks/api/usePosition';
import { QueryProvider } from '@/providers/QueryProvider';
import { getTranslations } from 'next-intl/server'; // i18n
```

#### Find & Replace Commands

Use these commands to update imports across all files:

```bash
# In packages/web/ directory

# Services
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's|@/services/|@duncan/shared|g' {} +

# Lib
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's|@/lib/|@duncan/shared|g' {} +

# Config
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's|@/config/|@duncan/shared|g' {} +

# Types
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's|@/types/|@duncan/shared|g' {} +
```

**Note:** After automated replacement, manually review and consolidate imports from `@duncan/shared` for cleaner code.

### 6. Environment Variables

Environment variables remain at the **root level** and are accessible to all packages.

**No changes needed:**
- `.env` (root)
- `.env.example` (root)
- `.env.local` (root)

**Prisma configuration:**
- `packages/shared/prisma/schema.prisma` reads `DATABASE_URL` from root `.env`
- Both `@duncan/web` and future `@duncan/worker` access same database

### 7. Git & Dependencies

#### Update `.gitignore`

Add monorepo-specific patterns:

```gitignore
# Dependencies
node_modules/
packages/*/node_modules/

# Build outputs
.next/
dist/
packages/*/.next/
packages/*/dist/

# Environment
.env
.env.local

# Package managers
package-lock.json
pnpm-lock.yaml

# Prisma
packages/shared/.env
packages/shared/prisma/.env
```

#### Migration Commands

```bash
# 1. Delete old package manager files
rm -rf node_modules package-lock.json

# 2. Install pnpm globally (if not already installed)
npm install -g pnpm

# 3. Install all workspace dependencies
pnpm install

# 4. Generate Prisma client
pnpm --filter @duncan/shared db:generate

# 5. Run database migrations (if needed)
pnpm db:migrate
```

### 8. Validation Steps

After migration, validate the setup:

```bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma client
pnpm --filter @duncan/shared db:generate

# 3. Type-check all packages
pnpm typecheck

# 4. Lint all packages
pnpm lint

# 5. Run development server
pnpm dev

# 6. Build all packages
pnpm build

# 7. Run tests
pnpm test

# 8. Seed database
pnpm db:seed
```

**Expected results:**
- ✅ No TypeScript errors
- ✅ Next.js dev server starts on http://localhost:3000
- ✅ All imports resolve correctly
- ✅ Prisma client available in both packages
- ✅ Build succeeds without errors

---

## Benefits of This Architecture

### ✅ Shared Prisma Client
- Both `@duncan/web` and future `@duncan/worker` use same database client
- Single source of truth for database schema
- Type-safe database access across all packages

### ✅ Code Reuse
- Services, utilities, types shared across packages
- No code duplication
- Consistent business logic

### ✅ Future Scalability
Easy to add new packages:

**Future Worker Package:**
```
packages/worker/
├── src/
│   ├── jobs/
│   │   ├── syncPositions.ts
│   │   └── updatePrices.ts
│   ├── queues/
│   └── index.ts
├── package.json          # Depends on @duncan/shared
└── tsconfig.json
```

Worker imports:
```typescript
import { PrismaClient } from '@prisma/client'; // From @duncan/shared
import { PositionService, EtherscanClient } from '@duncan/shared';
```

**Future Mobile App Package:**
```
packages/mobile/
├── src/
├── package.json          # Depends on @duncan/shared
└── tsconfig.json
```

**Future CLI Package:**
```
packages/cli/
├── src/
│   └── commands/
├── package.json          # Depends on @duncan/shared
└── tsconfig.json
```

### ✅ Better Organization
- Clear separation: UI (`@duncan/web`) vs Logic (`@duncan/shared`)
- Easier to navigate and maintain
- Enforced architectural boundaries

### ✅ Faster CI/CD
- Build only changed packages with pnpm's smart dependency graph
- Parallel builds across packages
- Faster deployment pipeline

### ✅ Type Safety
- Prisma types propagated across all packages
- Shared TypeScript types enforced at compile time
- No runtime type mismatches

---

## Migration Complexity

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Time Required** | 2-3 hours | Mostly mechanical file moves and import updates |
| **Risk Level** | Low | Can be done incrementally, easy rollback with git |
| **Breaking Changes** | None | Internal refactor, no API changes |
| **Rollback** | Easy | `git revert` restores original structure |

---

## Troubleshooting

### Issue: TypeScript can't find `@duncan/shared`

**Solution:**
1. Ensure `pnpm install` completed successfully
2. Check `tsconfig.json` paths configuration
3. Restart TypeScript server in IDE: `Cmd+Shift+P` → "Restart TS Server"

### Issue: Prisma client not found

**Solution:**
```bash
pnpm --filter @duncan/shared db:generate
```

### Issue: Next.js can't resolve shared package

**Solution:**
Add to `packages/web/next.config.ts`:
```typescript
transpilePackages: ['@duncan/shared']
```

### Issue: Build fails with "Cannot find module"

**Solution:**
1. Check all import paths updated correctly
2. Ensure `@duncan/shared` exports the module in `src/index.ts`
3. Clear Next.js cache: `rm -rf packages/web/.next`

---

## Future Enhancements

Once monorepo is established, consider:

1. **Add `packages/worker/`** - Background job processing
   - Position syncing
   - Price updates
   - APR calculations
   - Event indexing

2. **Add `packages/cli/`** - Command-line tools
   - Database management
   - Admin operations
   - Development utilities

3. **Add `packages/mobile/`** - React Native mobile app
   - Reuses all business logic from `@duncan/shared`
   - Shared types and API client

4. **Add `packages/sdk/`** - Public SDK for DUNCAN platform
   - Expose position management APIs
   - Publishable to npm

5. **Optimize Prisma** - Create database package
   - `packages/database/` with just Prisma schema
   - Both `shared` and `worker` depend on it

---

## References

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Next.js Monorepo](https://nextjs.org/docs/advanced-features/multi-zones)
- [Prisma in Monorepo](https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate/advanced-migrate-scenarios#add-prisma-migrate-to-an-existing-project)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

---

## Checklist

Before starting migration:
- [ ] Commit all current changes
- [ ] Create new branch: `git checkout -b feat/monorepo-migration`
- [ ] Install pnpm: `npm install -g pnpm`
- [ ] Back up `.env` files

During migration:
- [ ] Create root `pnpm-workspace.yaml`
- [ ] Create root `package.json` with workspace scripts
- [ ] Create `packages/web/` with Next.js app
- [ ] Create `packages/shared/` with business logic + Prisma
- [ ] Move Prisma to `packages/shared/prisma/`
- [ ] Update all import paths in web package
- [ ] Create `packages/shared/src/index.ts` with exports
- [ ] Update TypeScript configurations
- [ ] Update `.gitignore`
- [ ] Delete old `node_modules/` and `package-lock.json`

After migration:
- [ ] Run `pnpm install`
- [ ] Run `pnpm --filter @duncan/shared db:generate`
- [ ] Run `pnpm typecheck`
- [ ] Run `pnpm dev` - verify app starts
- [ ] Run `pnpm build` - verify build succeeds
- [ ] Run `pnpm test` - verify tests pass
- [ ] Commit changes: `git commit -m "feat: migrate to pnpm monorepo"`
- [ ] Create PR for review

---

**Status:** Ready to execute
**Last Updated:** October 3, 2025
