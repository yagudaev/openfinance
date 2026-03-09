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
  expectedTool: 'evaluate_expression',
  strictMode: false,
  buildPayload: ({ payload }) => {
    const output = payload.output as RunnerOutput
    return { toolCalls: output.toolCalls }
  },
})

const answerCorrectnessScorer = buildScorer({
  id: 'answer-correctness',
  label: 'Answer Correctness',
  description: 'Checks if the expected numeric answer appears in the response text',
})
  .score(({ payload }) => {
    const expected = payload.expected as number | undefined
    if (expected === undefined) return { score: 1.0, metadata: { skipped: true } }
    const output = payload.output as RunnerOutput
    const found = output.text?.includes(String(expected)) ?? false
    return { score: found ? 1.0 : 0.0, metadata: { expected, found } }
  })
  .reason(({ score }) =>
    (score ?? 0) >= 1.0 ? 'Expected answer found in response' : 'Expected answer not found in response',
  )
  .build()

// --- pricing (loaded once before experiment runs) ---

let pricing: Record<string, { prompt: number; completion: number }> = {}

const MODEL_ID = process.env.EVAL_MODEL ?? 'openrouter/openai/gpt-4o-mini'

// --- experiment ---

export default createExperiment({
  id: `math-tool-usage-${MODEL_ID.replace(/\//g, '-')}`,
  label: `Math Tool Usage — ${MODEL_ID}`,
  description: `Verifies ${MODEL_ID} uses evaluate_expression tool for math prompts`,

  dataset: {
    items: [
      {
        id: 'percentage-calculation',
        input: 'What is 18% of $4,250?',
        expected: 765,
      },
    ],
  },

  runner: async ({ item }) => {
    if (Object.keys(pricing).length === 0) {
      pricing = await fetchPricing()
    }

    const result = await agent.generateText(String(item.input), {
      context: { modelId: MODEL_ID },
    })

    const toolCalls = (result.steps?.flatMap((step) => step.toolCalls) ?? []).map((tc) => ({
      toolName: tc.toolName,
      args: 'args' in tc ? (tc.args as Record<string, unknown>) : undefined,
    }))

    const inputTokens = result.usage?.inputTokens ?? 0
    const outputTokens = result.usage?.outputTokens ?? 0
    const cost = calculateCost(MODEL_ID, inputTokens, outputTokens, pricing)

    const output: RunnerOutput = { text: result.text, toolCalls }
    return {
      output,
      metadata: { modelId: MODEL_ID, inputTokens, outputTokens, cost },
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
    name: 'math-tool-usage',
    autoCreate: true,
  },

  tags: ['eval', 'math', 'tool-usage'],
  metadata: { modelId: MODEL_ID },
})
