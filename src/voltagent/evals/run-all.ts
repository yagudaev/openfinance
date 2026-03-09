import { runExperiment } from '@voltagent/evals'
import { VoltOpsClient } from '@voltagent/sdk'

import { createMathExperiment } from './math-tool-usage.experiment'
import { createInvestmentGrowthExperiment } from './investment-growth.experiment'

const MODELS = [
  'openrouter/z-ai/glm-4.7',
  'openrouter/z-ai/glm-5',
  'openrouter/anthropic/claude-sonnet-4-5',
  'openrouter/google/gemini-3.1-pro-preview',
  'openrouter/google/gemini-3-flash-preview',
  'openrouter/openai/gpt-4o-mini',
  'openrouter/openai/gpt-4o',
]

main()
  .then((passed) => process.exit(passed ? 0 : 1))
  .catch((error) => {
    console.error('Eval runner error:', error)
    process.exit(1)
  })

async function main() {
  const modelArg = process.argv[2]
  const modelsToRun = modelArg ? [modelArg] : MODELS

  const voltOpsClient = new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
    secretKey: process.env.VOLTAGENT_SECRET_KEY!,
  })

  let allPassed = true

  for (const modelId of modelsToRun) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Model: ${modelId}`)
    console.log('='.repeat(60))

    const mathResult = await runExperiment(createMathExperiment(modelId), { voltOpsClient })
    const investmentResult = await runExperiment(createInvestmentGrowthExperiment(modelId), { voltOpsClient })

    for (const result of [mathResult, investmentResult]) {
      const { summary } = result
      const passed = summary.failureCount === 0 && summary.errorCount === 0
      const icon = passed ? 'PASS' : 'FAIL'

      console.log(`  ${icon}: ${summary.successCount}/${summary.totalCount} passed, mean score ${summary.meanScore?.toFixed(2) ?? 'N/A'}`)

      if (!passed) allPassed = false
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(allPassed ? 'All evals passed!' : 'Some evals failed.')

  return allPassed
}
