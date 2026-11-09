# COORIZON — Production Dockerfile
# Next.js 16 standalone build with Prisma + SQLite

# ─── Base image ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS base

# Install dependencies needed for bcrypt and sharp on alpine
RUN apk add --no-cache libc6-compat openssl python3 make g++

# ─── Dependencies ───────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
COPY prisma ./prisma/

# Install dependencies using npm (compatible with the existing lockfile)
RUN npm install --legacy-peer-deps

# Generate Prisma client
RUN npx prisma generate

# ─── Builder ────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set env for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/app/db/build.db"

# Generate Prisma client again (in case schema changed)
RUN npx prisma generate

# Build Next.js
RUN npm run build

# ─── Runner ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache libc6-compat openssl

# Create data directory for SQLite
RUN mkdir -p /app/data /app/uploads

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Default DATABASE_URL — can be overridden by Coolify env
ENV DATABASE_URL="file:/app/data/coorizon.db"

# Copy standalone Next.js output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma files for migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy seed script
COPY --from=builder /app/prisma/seed.ts ./prisma/seed.ts
COPY --from=builder /app/src/lib ./src/lib

# Copy package.json for scripts
COPY --from=builder /app/package.json ./package.json

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'echo "→ Running database migrations..."' >> /app/start.sh && \
    echo 'npx prisma db push --accept-data-loss' >> /app/start.sh && \
    echo 'echo "→ Seeding database (if needed)..."' >> /app/start.sh && \
    echo 'npx tsx prisma/seed.ts || echo "Seed skipped (may already exist)"' >> /app/start.sh && \
    echo 'echo "→ Starting COORIZON..."' >> /app/start.sh && \
    echo 'exec node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 3000

# Persistent volumes
VOLUME ["/app/data", "/app/uploads"]

CMD ["/app/start.sh"]
