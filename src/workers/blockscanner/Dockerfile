# Multi-stage build for Blockscanner Worker
# Optimized for Fly.io deployment

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for main dependencies
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including root dependencies)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy worker-specific files
COPY src/workers/blockscanner ./src/workers/blockscanner/

# Copy shared source code that worker imports
COPY src/lib ./src/lib/
COPY src/services ./src/services/
COPY src/types ./src/types/
COPY src/config ./src/config/
COPY src/app-shared ./src/app-shared/

# Build worker
WORKDIR /app/src/workers/blockscanner
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

# Generate Prisma client in production
RUN npx prisma generate

# Copy built worker
COPY --from=builder /app/src/workers/blockscanner/dist ./dist/

# Copy shared source code (some services may need direct access)
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
