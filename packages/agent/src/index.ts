import { Agent, createTool } from '@voltagent/core'
import { z } from 'zod'

// Financial advisor agent
export const financialAdvisor = new Agent({
  name: 'financial-advisor',
  instructions: \`You are a personal financial advisor. You help users understand their spending patterns, 
set budgets, and make informed financial decisions. You have access to their transaction history 
and account information. Be helpful, concise, and always prioritize the user's financial wellbeing.\`,
  model: 'openai/gpt-4o-mini',
  tools: [
    // TODO: Add tools to query transactions, accounts, etc.
  ],
})

// Market tracking agent (for daily updates)
export const marketTracker = new Agent({
  name: 'market-tracker',
  instructions: \`You monitor financial markets and economic news. Your job is to identify events 
that might impact the user's financial plan and provide brief, actionable summaries.\`,
  model: 'openai/gpt-4o-mini',
  tools: [
    // TODO: Add tools to fetch market data
  ],
})
