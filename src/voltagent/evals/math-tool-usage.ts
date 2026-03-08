import { agent } from '../agents'

const MODEL_ID = process.env.EVAL_MODEL_ID ?? 'openrouter/z-ai/glm-4.7'

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
  console.log(`Model: ${MODEL_ID}`)

  for (const evalCase of cases) {
    await runEval(evalCase)
  }

  console.log(`\n${passed} passed, ${failed} failed`)

  if (failed > 0) {
    process.exit(1)
  } else {
    console.log('\nAll evals passed!')
    process.exit(0)
  }
}

async function runEval(evalCase: EvalCase) {
  console.log(`\nEval: ${evalCase.name}`)
  console.log(`  Prompt: "${evalCase.prompt}"`)
  console.log(`  Model: ${MODEL_ID}`)

  const result = await agent.generateText(evalCase.prompt, {
    context: { modelId: MODEL_ID },
  })

  const allToolCalls = result.steps?.flatMap(step => step.toolCalls) ?? []
  const toolNames = allToolCalls.map(tc => tc.toolName)

  console.log(`  Tool calls: ${toolNames.length > 0 ? toolNames.join(', ') : '(none)'}`)
  console.log(`  Response: ${result.text?.slice(0, 120)}...`)

  assert(
    toolNames.includes(evalCase.expectedToolName),
    `Agent used ${evalCase.expectedToolName} (got: [${toolNames.join(', ')}])`,
  )

  if (evalCase.expectedAnswer !== undefined) {
    const hasCorrectAnswer = result.text?.includes(String(evalCase.expectedAnswer)) ?? false
    assert(
      hasCorrectAnswer,
      `Response contains expected answer ${evalCase.expectedAnswer}`,
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
