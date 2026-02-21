import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@libsql/client', 'better-sqlite3', '@prisma/adapter-better-sqlite3', 'pdf-parse'],
}

export default nextConfig
