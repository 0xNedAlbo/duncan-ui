# Multi-stage build for Blockscanner Worker
# Optimized for Fly.io deployment

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools for native dependencies
RUN apk add --no-cache python3 make g++

# Install root project dependencies (needed for shared code compilation)
COPY package*.json ./
RUN npm ci

# Copy root prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy shared source code that worker imports
COPY src/lib ./src/lib/
COPY src/services ./src/services/
COPY src/types ./src/types/
COPY src/config ./src/config/
COPY src/app-shared ./src/app-shared/

# Copy worker files
COPY src/workers/blockscanner ./src/workers/blockscanner/

# Install worker-specific dependencies
WORKDIR /app/src/workers/blockscanner
RUN npm ci

# Build worker TypeScript (uses root node_modules for shared deps)
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Install build tools for native dependencies
RUN apk add --no-cache python3 make g++

# Install root production dependencies (needed for shared code at runtime)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Install worker production dependencies
COPY src/workers/blockscanner/package*.json ./worker/
WORKDIR /app/worker
RUN npm ci --omit=dev

# Copy built worker
WORKDIR /app
COPY --from=builder /app/src/workers/blockscanner/dist ./dist/

# Copy shared source code (needed at runtime for imports)
COPY --from=builder /app/src/lib ./src/lib/
COPY --from=builder /app/src/services ./src/services/
COPY --from=builder /app/src/types ./src/types/
COPY --from=builder /app/src/config ./src/config/
COPY --from=builder /app/src/app-shared ./src/app-shared/

# Create non-root user
RUN addgroup --system --gid 1001 worker && \
    adduser --system --uid 1001 worker

USER worker

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "process.exit(0)"

CMD ["node", "dist/index.js"]
