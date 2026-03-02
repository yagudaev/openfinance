import { evaluateExpressionTool, predictInvestmentGrowthTool } from './agents'

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

async function testEvaluateExpression() {
  console.log('\nTest 1: evaluate_expression tool')

  const result = await evaluateExpressionTool.execute(
    { expression: '1500 * 12 + 500' },
    { operationId: 'test', agentId: 'test' } as never,
  )

  assert(result !== null && result !== undefined, 'Result is not null')
  assert(
    typeof result === 'object' && 'result' in result,
    'Result has "result" property',
  )

  const value = (result as { result: number }).result
  assert(value === 18500, `Result is 18500 (got ${value})`)
  assert(
    !('error' in result && (result as { error?: string }).error),
    'No error in result',
  )
}

async function testPredictInvestmentGrowth() {
  console.log('\nTest 2: predict_investment_growth tool')

  const result = await predictInvestmentGrowthTool.execute(
    {
      ticker: 'SPY',
      initial_investment: 10000,
      years: 25,
      annual_return: 0.10,
    },
    { operationId: 'test', agentId: 'test' } as never,
  )

  assert(result !== null && result !== undefined, 'Result is not null')
  assert(
    typeof result === 'object' && 'chart' in result,
    'Result has "chart" property',
  )

  const chart = (result as { chart: { title: string; data: Array<{ label: string; value: number }> } }).chart
  assert(chart.title === 'SPY Growth Projection', `Title is "SPY Growth Projection" (got "${chart.title}")`)
  assert(Array.isArray(chart.data), 'Data is an array')
  assert(
    chart.data.length === 26,
    `Data has 26 points (year 0 through 25) (got ${chart.data.length})`,
  )

  // Year 0 should be the initial investment
  assert(chart.data[0].value === 10000, `Year 0 value is 10000 (got ${chart.data[0].value})`)

  // Final value after 25 years at 10% annual return: 10000 * 1.10^25 ≈ 108,347
  const finalValue = chart.data[chart.data.length - 1].value
  assert(
    finalValue > 108000 && finalValue < 109000,
    `Final value is approximately $108,347 (got $${finalValue.toLocaleString()})`,
  )
}

async function main() {
  console.log('Running VoltAgent tool tests...')

  await testEvaluateExpression()
  await testPredictInvestmentGrowth()

  console.log(`\n${passed} passed, ${failed} failed`)

  if (failed > 0) {
    process.exit(1)
  } else {
    console.log('\nAll tests passed!')
    process.exit(0)
  }
}

main().catch((error) => {
  console.error('Test runner error:', error)
  process.exit(1)
})
