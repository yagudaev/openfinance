import { Agent, createTool } from '@voltagent/core'
import { openai } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { z } from 'zod'

import { safeEvaluate } from '@/lib/chat/finance-tools'

export const evaluateExpressionTool = createTool({
  name: 'evaluate_expression',
  description:
    'Safely evaluate a mathematical expression using mathjs. Use for custom calculations that don\'t fit other tools.',
  parameters: z.object({
    expression: z
      .string()
      .describe(
        'Mathematical expression to evaluate (e.g., "50000 * 0.18", "compound interest formula")',
      ),
  }),
  execute: async ({ expression }) => {
    return safeEvaluate(expression)
  },
})

export const predictInvestmentGrowthTool = createTool({
  name: 'predict_investment_growth',
  description:
    'Predict investment growth over time using compound interest. Returns year-by-year projections as chart data. Use this when the user asks about investment projections, portfolio growth, or "what if I invest X".',
  parameters: z.object({
    ticker: z
      .string()
      .default('SPY')
      .describe('Ticker symbol for the investment (e.g., "SPY", "QQQ"). Default "SPY".'),
    initial_investment: z
      .number()
      .describe('Initial investment amount in dollars'),
    years: z
      .number()
      .default(25)
      .describe('Number of years to project. Default 25.'),
    annual_return: z
      .number()
      .default(0.10)
      .describe('Expected annual return rate as decimal (e.g., 0.10 for 10%). Default 0.10.'),
  }),
  execute: async ({ ticker, initial_investment, years, annual_return }) => {
    const currentYear = new Date().getFullYear()
    const data: Array<{ label: string, value: number, source: string }> = []

    let balance = initial_investment
    data.push({
      label: String(currentYear),
      value: Math.round(balance * 100) / 100,
      source: 'assumption:initial investment',
    })

    for (let y = 1; y <= years; y++) {
      balance = balance * (1 + annual_return)
      data.push({
        label: String(currentYear + y),
        value: Math.round(balance * 100) / 100,
        source: `assumption:${(annual_return * 100).toFixed(0)}% annual return`,
      })
    }

    return {
      chart: {
        title: `${ticker} Growth Projection`,
        chartType: 'area' as const,
        data,
        xAxisLabel: 'Year',
        yAxisLabel: 'Portfolio Value',
        valuePrefix: '$',
        valueSuffix: '',
      },
    }
  },
})

export const agent = new Agent({
  name: 'OpenFinance',
  instructions: ({ context }): string => {
    const instructions = context?.get('systemPrompt') as string | undefined
    return instructions ?? 'You are a knowledgeable financial advisor embedded in OpenFinance.'
  },
  model: ({ context }) => {
    const modelId = (context?.get('modelId') as string | undefined) ?? 'openrouter/z-ai/glm-4.7'
    return getModel(modelId)
  },
  tools: [evaluateExpressionTool, predictInvestmentGrowthTool],
  maxSteps: 5,
})

function getModel(modelId: string) {
  if (modelId.startsWith('openrouter/')) {
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    })
    return openrouter(modelId.replace('openrouter/', ''))
  }

  const openaiModelId = modelId.replace('openai/', '')
  return openai(openaiModelId)
}