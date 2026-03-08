import { agent } from '../agents'

const MODELS = [
  'openrouter/z-ai/glm-4.7',
  'openrouter/z-ai/glm-5',
  'openrouter/anthropic/claude-sonnet-4-5',
  'openrouter/google/gemini-3.1-pro-preview',
  'openrouter/google/gemini-3-flash-preview',
  'openrouter/openai/gpt-4o-mini',
  'openrouter/openai/gpt-4o',
]

interface EvalCase {
  name: string
  prompt: string
  expectedToolName: string
  expectedAnswer?: number
}

const cases: EvalCase[] = [
  {
    name: 'percentage calculation',
    prompt: 'What is 18% of $4,250?',
    expectedToolName: 'evaluate_expression',
    expectedAnswer: 765,
  },
]

// --- entry point ---

main().catch((error) => {
  console.error('Eval runner error:', error)
  process.exit(1)
})

async function main() {
  console.log('Running VoltAgent evals...')
  console.log(`Models: ${MODELS.length}\n`)

  for (const modelId of MODELS) {
    for (const evalCase of cases) {
      try {
        await runEval(modelId, evalCase)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`\n  ERROR [${modelId}] ${evalCase.name}: ${message}`)
        failed++
      }
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`)

  if (failed > 0) {
    process.exit(1)
  } else {
    console.log('\nAll evals passed!')
    process.exit(0)
  }
}

async function runEval(modelId: string, evalCase: EvalCase) {
  const label = `[${modelId}] ${evalCase.name}`
  console.log(`\nEval: ${label}`)
  console.log(`  Prompt: "${evalCase.prompt}"`)

  const result = await agent.generateText(evalCase.prompt, {
    context: { modelId },
  })

  const allToolCalls = result.steps?.flatMap(step => step.toolCalls) ?? []
  const toolNames = allToolCalls.map(tc => tc.toolName)

  console.log(`  Tool calls: ${toolNames.length > 0 ? toolNames.join(', ') : '(none)'}`)
  console.log(`  Response: ${result.text?.slice(0, 120)}...`)

  assert(
    toolNames.includes(evalCase.expectedToolName),
    `${label}: used ${evalCase.expectedToolName} (got: [${toolNames.join(', ')}])`,
  )

  if (evalCase.expectedAnswer !== undefined) {
    const hasCorrectAnswer = result.text?.includes(String(evalCase.expectedAnswer)) ?? false
    assert(
      hasCorrectAnswer,
      `${label}: response contains ${evalCase.expectedAnswer}`,
    )
  }
}

// --- test helpers ---

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  PASS: ${message}`)
    passed++
  } else {
    console.error(`  FAIL: ${message}`)
    failed++
  }
}
