FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare yarn@4.0.0 --activate

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml* ./
COPY .yarn .yarn 2>/dev/null || true
COPY prisma ./prisma
RUN yarn install --immutable || yarn install
RUN yarn db:generate

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.yarn ./.yarn 2>/dev/null || true
COPY --from=deps /app/prisma ./prisma
COPY . .
RUN yarn build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "server.js"]
