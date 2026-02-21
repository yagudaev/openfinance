import { evaluate } from 'mathjs'

// 2025 Canadian Federal tax brackets
const FEDERAL_BRACKETS = [
  { min: 0, max: 57375, rate: 0.15 },
  { min: 57375, max: 114750, rate: 0.205 },
  { min: 114750, max: 158468, rate: 0.26 },
  { min: 158468, max: 221708, rate: 0.29 },
  { min: 221708, max: Infinity, rate: 0.33 },
]

// Basic personal amount
const BASIC_PERSONAL_AMOUNT = 16129

// 2025 TFSA annual limit
const TFSA_ANNUAL_LIMIT = 7000

// 2025 RRSP contribution limit (18% of earned income, max)
const RRSP_MAX_LIMIT = 32490

export function calculateFederalTax(income: number): {
  totalTax: number
  effectiveRate: number
  marginalRate: number
  brackets: { bracket: string; taxableAmount: number; tax: number; rate: number }[]
} {
  const taxableIncome = Math.max(0, income - BASIC_PERSONAL_AMOUNT)
  let remaining = taxableIncome
  let totalTax = 0
  const brackets: { bracket: string; taxableAmount: number; tax: number; rate: number }[] = []
  let marginalRate = 0

  for (const b of FEDERAL_BRACKETS) {
    const bracketSize = b.max === Infinity ? remaining : Math.min(b.max - b.min, remaining)
    if (bracketSize <= 0) break

    const tax = bracketSize * b.rate
    totalTax += tax
    marginalRate = b.rate

    brackets.push({
      bracket: b.max === Infinity
        ? `$${b.min.toLocaleString()}+`
        : `$${b.min.toLocaleString()} - $${b.max.toLocaleString()}`,
      taxableAmount: Math.round(bracketSize * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      rate: b.rate,
    })

    remaining -= bracketSize
  }

  return {
    totalTax: Math.round(totalTax * 100) / 100,
    effectiveRate: income > 0 ? Math.round((totalTax / income) * 10000) / 10000 : 0,
    marginalRate,
    brackets,
  }
}

export function calculateCompoundGrowth(params: {
  principal: number
  monthlyContribution: number
  annualRate: number
  years: number
}): {
  finalValue: number
  totalContributions: number
  totalGrowth: number
  yearByYear: { year: number; contributions: number; growth: number; balance: number }[]
} {
  const { principal, monthlyContribution, annualRate, years } = params
  const monthlyRate = annualRate / 12
  const yearByYear: { year: number; contributions: number; growth: number; balance: number }[] = []

  let balance = principal
  let totalContributions = principal

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + monthlyContribution
    }
    totalContributions += monthlyContribution * 12
    yearByYear.push({
      year: y,
      contributions: Math.round(totalContributions * 100) / 100,
      growth: Math.round((balance - totalContributions) * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    })
  }

  return {
    finalValue: Math.round(balance * 100) / 100,
    totalContributions: Math.round(totalContributions * 100) / 100,
    totalGrowth: Math.round((balance - totalContributions) * 100) / 100,
    yearByYear,
  }
}

export function safeEvaluate(expression: string): { result: number | string; error?: string } {
  try {
    const result = evaluate(expression)
    return { result: typeof result === 'number' ? Math.round(result * 100) / 100 : String(result) }
  } catch (error) {
    return { result: 0, error: String(error) }
  }
}

export function getRRSPInfo(income: number) {
  const contributionRoom = Math.min(income * 0.18, RRSP_MAX_LIMIT)
  const taxResult = calculateFederalTax(income)
  const taxSavings = contributionRoom * taxResult.marginalRate

  return {
    maxContributionRoom: Math.round(contributionRoom * 100) / 100,
    annualLimit: RRSP_MAX_LIMIT,
    estimatedTaxRefund: Math.round(taxSavings * 100) / 100,
    marginalRate: taxResult.marginalRate,
    note: 'Based on federal tax only. Provincial tax savings would be additional.',
  }
}

export function getTFSAInfo() {
  return {
    annualLimit: TFSA_ANNUAL_LIMIT,
    note: 'Contributions are not tax-deductible, but growth and withdrawals are tax-free.',
  }
}
