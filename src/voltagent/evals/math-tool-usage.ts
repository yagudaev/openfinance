import { createExperiment, runExperiment } from '@voltagent/evals'
import { createToolCallAccuracyScorerCode } from '@voltagent/scorers'
import { buildScorer } from '@voltagent/core'
import { VoltOpsClient } from '@voltagent/sdk'

import { agent } from '../agents'
import { fetchPricing, calculateCost } from '@/lib/pricing'

const MODELS = [
  'openrouter/z-ai/glm-4.7',
  'openrouter/z-ai/glm-5',
  'openrouter/anthropic/claude-sonnet-4-5',
  'openrouter/google/gemini-3.1-pro-preview',
  'openrouter/google/gemini-3-flash-preview',
  'openrouter/openai/gpt-4o-mini',
  'openrouter/openai/gpt-4o',
]

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

// --- experiment factory ---

let pricing: Record<string, { prompt: number; completion: number }> = {}

function createMathExperiment(modelId: string) {
  return createExperiment({
    id: `math-tool-usage-${modelId.replace(/\//g, '-')}`,
    label: `Math Tool Usage — ${modelId}`,
    description: `Verifies ${modelId} uses evaluate_expression tool for math prompts`,

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
      const result = await agent.generateText(String(item.input), {
        context: { modelId },
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
      }
    },

    scorers: [
      { scorer: toolUsageScorer, threshold: 1.0 },
      { scorer: answerCorrectnessScorer, threshold: 1.0 },
    ],

    passCriteria: [
      { type: 'passRate' as const, min: 1.0, label: 'All items must pass' },
    ],

    experiment: {
      name: 'math-tool-usage',
      autoCreate: true,
    },

    tags: ['eval', 'math', 'tool-usage'],
    metadata: { modelId },
  })
}

// --- entry point ---

main().catch((error) => {
  console.error('Eval runner error:', error)
  process.exit(1)
})

async function main() {
  const modelArg = process.argv[2]
  const modelsToRun = modelArg ? [modelArg] : MODELS

  console.log(`Running math-tool-usage eval for ${modelsToRun.length} model(s)...\n`)

  pricing = await fetchPricing()
  console.log(`Pricing: ${Object.keys(pricing).length} models loaded\n`)

  const voltOpsClient = new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
    secretKey: process.env.VOLTAGENT_SECRET_KEY!,
  })

  let allPassed = true

  for (const modelId of modelsToRun) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Model: ${modelId}`)
    console.log('='.repeat(60))

    const experiment = createMathExperiment(modelId)
    const result = await runExperiment(experiment, {
      voltOpsClient,
      onItem: ({ item, result: itemResult }) => {
        const meta = itemResult.runner?.metadata as Record<string, unknown> | undefined
        console.log(`  [${item.id}]`)
        console.log(`    Tokens: ${meta?.inputTokens ?? '?'} in / ${meta?.outputTokens ?? '?'} out — $${Number(meta?.cost ?? 0).toFixed(4)}`)

        for (const [scorerId, score] of Object.entries(itemResult.scores ?? {})) {
          const icon = (score.score ?? 0) >= (score.threshold ?? 0) ? 'PASS' : 'FAIL'
          console.log(`    ${icon}: ${scorerId} — ${score.score} ${score.reason ? `(${score.reason})` : ''}`)
        }
      },
    })

    const { summary } = result
    console.log(`\n  Summary: ${summary.successCount}/${summary.totalCount} passed, mean score ${summary.meanScore?.toFixed(2) ?? 'N/A'}`)

    if (summary.failureCount > 0 || summary.errorCount > 0) {
      allPassed = false
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  if (allPassed) {
    console.log('All evals passed!')
    process.exit(0)
  } else {
    console.log('Some evals failed.')
    process.exit(1)
  }
}
