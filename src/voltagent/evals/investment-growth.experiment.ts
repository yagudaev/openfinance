import { createExperiment } from '@voltagent/evals'
import { createToolCallAccuracyScorerCode } from '@voltagent/scorers'
import { buildScorer } from '@voltagent/core'

import { agent } from '../agents'
import { fetchPricing, calculateCost } from '@/lib/pricing'

// --- types ---

interface RunnerOutput {
  text: string | undefined
  toolCalls: Array<{ toolName: string; args?: Record<string, unknown> }>
}

// --- scorers ---

const toolUsageScorer = createToolCallAccuracyScorerCode({
  id: 'tool-usage',
  name: 'Tool Usage',
  expectedTool: 'predict_investment_growth',
  strictMode: false,
  buildPayload: ({ payload }) => {
    const output = payload.output as RunnerOutput
    return { toolCalls: output.toolCalls }
  },
})

const chartDataScorer = buildScorer({
  id: 'chart-data-present',
  label: 'Chart Data Present',
  description: 'Checks if the response text contains chart data or investment projection results',
})
  .score(({ payload }) => {
    const output = payload.output as RunnerOutput
    const text = output.text ?? ''

    const hasProjectionData =
      text.includes('$') ||
      text.includes('growth') ||
      text.includes('projection') ||
      text.includes('year') ||
      text.includes('portfolio')

    return {
      score: hasProjectionData ? 1.0 : 0.0,
      metadata: { hasProjectionData, textLength: text.length },
    }
  })
  .reason(({ score }) =>
    (score ?? 0) >= 1.0
      ? 'Response contains investment projection data'
      : 'Response does not contain investment projection data',
  )
  .build()

// --- pricing (loaded once before experiment runs) ---

let pricing: Record<string, { prompt: number; completion: number }> = {}

// --- experiment factory ---

export function createInvestmentGrowthExperiment(modelId: string) {
  return createExperiment({
    id: `investment-growth-${modelId.replace(/\//g, '-')}`,
    label: `Investment Growth Tool Usage — ${modelId}`,
    description: `Verifies ${modelId} uses predict_investment_growth tool for investment prompts`,

    dataset: {
      items: [
        {
          id: 'spy-25-years',
          input: 'What would $10,000 grow to in 25 years invested in SPY?',
          expected: undefined,
        },
        {
          id: 'qqq-10-years',
          input: 'If I invest $50,000 in QQQ, what will it be worth in 10 years?',
          expected: undefined,
        },
      ],
    },

    runner: async ({ item }) => {
      if (Object.keys(pricing).length === 0) {
        pricing = await fetchPricing()
      }

      let traceId: string | undefined

      const result = await agent.generateText(String(item.input), {
        context: { modelId },
        hooks: {
          onEnd: ({ context }) => {
            traceId = context.traceContext.getRootSpan().spanContext().traceId
          },
        },
      })

      const toolCalls = (result.steps?.flatMap((step) => step.toolCalls) ?? []).map((tc) => ({
        toolName: tc.toolName,
        args: 'args' in tc ? (tc.args as Record<string, unknown>) : undefined,
      }))

      const inputTokens = result.usage?.inputTokens ?? 0
      const outputTokens = result.usage?.outputTokens ?? 0
      const cost = calculateCost(modelId, inputTokens, outputTokens, pricing)

      const output: RunnerOutput = { text: result.text, toolCalls }
      return {
        output,
        metadata: { modelId, inputTokens, outputTokens, cost },
        traceIds: traceId ? [traceId] : undefined,
      }
    },

    scorers: [
      { scorer: toolUsageScorer, threshold: 1.0 },
      { scorer: chartDataScorer, threshold: 1.0 },
    ],

    passCriteria: [
      { type: 'passRate', min: 1.0, label: 'All items must pass' },
    ],

    experiment: {
      name: 'investment-growth',
      autoCreate: true,
    },

    tags: ['eval', 'investment', 'tool-usage'],
    metadata: { modelId },
  })
}

// Default export for `volt eval run --experiment` (single model via env var)
const MODEL_ID = process.env.EVAL_MODEL ?? 'openrouter/z-ai/glm-4.7'
export default createInvestmentGrowthExperiment(MODEL_ID)
