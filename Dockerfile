FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare yarn@4.0.0 --activate

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY prisma ./prisma
RUN yarn install
RUN yarn db:generate

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
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

# Install Prisma CLI separately for db push at startup
# (prisma has deep transitive deps that standalone output doesn't include)
RUN npm install --no-save --prefix /app/prisma-cli prisma@6.19.2

COPY start.sh ./

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["sh", "start.sh"]
