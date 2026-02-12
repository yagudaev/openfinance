import { VoltAgent } from '@voltagent/core'
import { honoServer } from '@voltagent/server-hono'
import { financialAdvisor, marketTracker } from './index'

new VoltAgent({
  agents: {
    financialAdvisor,
    marketTracker,
  },
  server: honoServer({ port: 3141 }),
})

console.log('🤖 VoltAgent server running on http://localhost:3141')
