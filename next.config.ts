import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: [
    '@libsql/client',
    'better-sqlite3',
    '@prisma/adapter-better-sqlite3',
    'pdf-parse',
    '@opentelemetry/api',
    '@opentelemetry/sdk-trace-node',
    '@opentelemetry/sdk-trace-base',
    '@langfuse/otel',
    '@langfuse/tracing',
    'googleapis',
  ],
}

export default nextConfig
