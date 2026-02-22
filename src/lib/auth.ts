import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'

import { encrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
const isGoogleEnabled = !!(googleClientId && googleClientSecret)

const betterAuthUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'sqlite',
  }),

  trustedOrigins: [betterAuthUrl],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  ...(isGoogleEnabled && {
    socialProviders: {
      google: {
        clientId: googleClientId!,
        clientSecret: googleClientSecret!,
      },
    },
  }),

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 300,
    },
  },

  databaseHooks: {
    account: {
      create: {
        async before(account) {
          const encrypted = { ...account }
          if (encrypted.accessToken) {
            encrypted.accessToken = encrypt(encrypted.accessToken)
          }
          if (encrypted.refreshToken) {
            encrypted.refreshToken = encrypt(encrypted.refreshToken)
          }
          if (encrypted.idToken) {
            encrypted.idToken = encrypt(encrypted.idToken)
          }
          return { data: encrypted }
        },
      },
      update: {
        async before(account) {
          const encrypted = { ...account }
          if (encrypted.accessToken) {
            encrypted.accessToken = encrypt(encrypted.accessToken)
          }
          if (encrypted.refreshToken) {
            encrypted.refreshToken = encrypt(encrypted.refreshToken)
          }
          if (encrypted.idToken) {
            encrypted.idToken = encrypt(encrypted.idToken)
          }
          return { data: encrypted }
        },
      },
    },
  },

  plugins: [nextCookies()],
})
