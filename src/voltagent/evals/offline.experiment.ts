import { existsSync } from 'fs'
import { resolve } from 'path'

import { createExperiment } from '@voltagent/evals'
import { buildScorer } from '@voltagent/core'

import { agent } from '../agents'
import { fetchPricing, calculateCost } from '@/lib/pricing'

// Load .env when running via `volt eval run` CLI (which doesn't support --env-file)
const envPath = resolve(process.cwd(), '.env')
if (existsSync(envPath)) {
  process.loadEnvFile(envPath)
}

// --- types ---

interface DatasetExpected {
  tool: string
  answer?: number
}

interface RunnerOutput {
  text: string | undefined
  toolCalls: Array<{ toolName: string; args?: Record<string, unknown> }>
}

// --- scorers ---

const toolUsageScorer = buildScorer({
  id: 'tool-usage',
  label: 'Tool Usage',
  description: 'Checks if the agent called the expected tool for this dataset item',
})
  .score(({ payload }) => {
    const expected = payload.expected as DatasetExpected | undefined
    if (!expected?.tool) return { score: 1.0, metadata: { skipped: true } }

    const output = payload.output as RunnerOutput
    const called = output.toolCalls.some((tc) => tc.toolName === expected.tool)

    return {
      score: called ? 1.0 : 0.0,
      metadata: { expectedTool: expected.tool, calledTools: output.toolCalls.map((tc) => tc.toolName) },
    }
  })
  .reason(({ score }) =>
    (score ?? 0) >= 1.0 ? 'Expected tool was called' : 'Expected tool was NOT called',
  )
  .build()

const answerCorrectnessScorer = buildScorer({
  id: 'answer-correctness',
  label: 'Answer Correctness',
  description: 'Checks if the expected numeric answer appears in the response text',
})
  .score(({ payload }) => {
    const expected = payload.expected as DatasetExpected | undefined
    if (expected?.answer === undefined) return { score: 1.0, metadata: { skipped: true } }

    const output = payload.output as RunnerOutput
    const found = output.text?.includes(String(expected.answer)) ?? false

    return { score: found ? 1.0 : 0.0, metadata: { expected: expected.answer, found } }
  })
  .reason(({ score }) =>
    (score ?? 0) >= 1.0 ? 'Expected answer found in response' : 'Expected answer not found in response',
  )
  .build()

// --- pricing (loaded once before experiment runs) ---

let pricing: Record<string, { prompt: number; completion: number }> = {}

// --- experiment factory ---

export function createOfflineExperiment(modelId: string) {
  return createExperiment({
    id: `openfinance-offline-${modelId.replace(/\//g, '-')}`,
    label: `OpenFinance Offline — ${modelId}`,
    description: `End-to-end tool usage and answer correctness for ${modelId}`,

    dataset: {
      items: [
        // Math tool usage
        {
          id: 'math-percentage',
          input: 'What is 18% of $4,250?',
          expected: { tool: 'evaluate_expression', answer: 765 },
        },
        // Investment growth tool usage
        {
          id: 'investment-spy-25y',
          input: 'What would $10,000 grow to in 25 years invested in SPY?',
          expected: { tool: 'predict_investment_growth' },
        },
        {
          id: 'investment-qqq-10y',
          input: 'If I invest $50,000 in QQQ, what will it be worth in 10 years?',
          expected: { tool: 'predict_investment_growth' },
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
      { scorer: answerCorrectnessScorer, threshold: 1.0 },
    ],

    passCriteria: [
      { type: 'passRate', min: 1.0, label: 'All items must pass' },
    ],

    experiment: {
      name: 'openfinance-offline',
      autoCreate: true,
    },

    tags: ['eval', 'offline'],
    metadata: { modelId },
  })
}

// Default export for `volt eval run --experiment` CLI
const MODEL_ID = process.env.EVAL_MODEL ?? 'openrouter/z-ai/glm-4.7'
export default createOfflineExperiment(MODEL_ID)
