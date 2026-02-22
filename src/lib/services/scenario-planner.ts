import { addMonths, format } from 'date-fns'

import { prisma } from '@/lib/prisma'

import type {
  ScenarioType,
  ProjectionPoint,
  DebtPayoffParams,
  SavingsParams,
  InvestmentParams,
  PurchaseParams,
  IncomeParams,
  ExpenseParams,
  RetirementParams,
  ScenarioParams,
  ScenarioData,
  ScenarioComparison,
} from './scenario-types'

export type {
  ScenarioType,
  ProjectionPoint,
  ScenarioParams,
  ScenarioData,
  ScenarioComparison,
} from './scenario-types'

// ============================================================
// Projection engines
// ============================================================

function monthLabel(monthsFromNow: number): string {
  return format(addMonths(new Date(), monthsFromNow), 'yyyy-MM')
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

export function projectDebtPayoff(params: DebtPayoffParams): ProjectionPoint[] {
  const points: ProjectionPoint[] = []
  const debts = params.debts.map(d => ({ ...d, remaining: d.balance }))

  // Sort by strategy
  if (params.strategy === 'avalanche') {
    debts.sort((a, b) => b.interestRate - a.interestRate)
  } else if (params.strategy === 'snowball') {
    debts.sort((a, b) => a.remaining - b.remaining)
  } else if (params.strategy === 'custom' && params.customOrder) {
    const order = params.customOrder
    debts.sort((a, b) => {
      const ai = order.indexOf(a.name)
      const bi = order.indexOf(b.name)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })
  }

  const initialTotalDebt = debts.reduce((s, d) => s + d.remaining, 0)

  // Initial point
  points.push({
    month: 0,
    date: monthLabel(0),
    netWorth: round(-initialTotalDebt),
    assets: 0,
    liabilities: round(initialTotalDebt),
  })

  const maxMonths = 360 // 30 years safety cap
  for (let m = 1; m <= maxMonths; m++) {
    let extraBudget = params.extraPayment

    // Apply interest and minimum payments
    for (const debt of debts) {
      if (debt.remaining <= 0) continue
      const monthlyInterest = debt.remaining * (debt.interestRate / 12)
      debt.remaining = debt.remaining + monthlyInterest - debt.minimumPayment
      if (debt.remaining < 0) {
        extraBudget += Math.abs(debt.remaining)
        debt.remaining = 0
      }
    }

    // Apply extra payment to first non-zero debt (focus debt)
    for (const debt of debts) {
      if (debt.remaining <= 0 || extraBudget <= 0) continue
      const payment = Math.min(extraBudget, debt.remaining)
      debt.remaining -= payment
      extraBudget -= payment
      break
    }

    const totalDebt = round(debts.reduce((s, d) => s + Math.max(0, d.remaining), 0))
    points.push({
      month: m,
      date: monthLabel(m),
      netWorth: round(-totalDebt),
      assets: 0,
      liabilities: totalDebt,
    })

    if (totalDebt <= 0) break
  }

  return points
}

export function projectSavings(params: SavingsParams): ProjectionPoint[] {
  const points: ProjectionPoint[] = []
  let balance = params.currentSavings
  const monthlyRate = params.annualReturnRate / 12

  points.push({
    month: 0,
    date: monthLabel(0),
    netWorth: round(balance),
    assets: round(balance),
    liabilities: 0,
  })

  for (let m = 1; m <= params.projectionMonths; m++) {
    balance = balance * (1 + monthlyRate) + params.monthlyContribution
    points.push({
      month: m,
      date: monthLabel(m),
      netWorth: round(balance),
      assets: round(balance),
      liabilities: 0,
    })
  }

  return points
}

export function projectInvestment(params: InvestmentParams): ProjectionPoint[] {
  const points: ProjectionPoint[] = []
  let balance = params.initialInvestment
  const monthlyRate = params.annualReturnRate / 12
  const totalMonths = params.projectionYears * 12

  points.push({
    month: 0,
    date: monthLabel(0),
    netWorth: round(balance),
    assets: round(balance),
    liabilities: 0,
  })

  for (let m = 1; m <= totalMonths; m++) {
    balance = balance * (1 + monthlyRate) + params.monthlyContribution
    points.push({
      month: m,
      date: monthLabel(m),
      netWorth: round(balance),
      assets: round(balance),
      liabilities: 0,
    })
  }

  return points
}

export function projectPurchase(params: PurchaseParams): ProjectionPoint[] {
  const points: ProjectionPoint[] = []
  const loanAmount = params.purchaseAmount - params.downPayment
  const monthlyRate = params.loanRate / 12
  const monthlySurplus = params.monthlyIncome - params.monthlyExpenses

  // Monthly loan payment (amortization formula)
  let monthlyPayment: number
  if (monthlyRate > 0) {
    monthlyPayment = loanAmount *
      (monthlyRate * Math.pow(1 + monthlyRate, params.loanTermMonths)) /
      (Math.pow(1 + monthlyRate, params.loanTermMonths) - 1)
  } else {
    monthlyPayment = loanAmount / params.loanTermMonths
  }

  let assets = params.currentAssets - params.downPayment + params.purchaseAmount
  let liabilities = params.currentLiabilities + loanAmount
  let loanBalance = loanAmount

  points.push({
    month: 0,
    date: monthLabel(0),
    netWorth: round(assets - liabilities),
    assets: round(assets),
    liabilities: round(liabilities),
  })

  for (let m = 1; m <= params.loanTermMonths; m++) {
    const interest = loanBalance * monthlyRate
    const principal = monthlyPayment - interest
    loanBalance = Math.max(0, loanBalance - principal)

    // Surplus after loan payment goes to savings
    const savingsGain = Math.max(0, monthlySurplus - monthlyPayment)
    assets += savingsGain
    liabilities = params.currentLiabilities + loanBalance

    points.push({
      month: m,
      date: monthLabel(m),
      netWorth: round(assets - liabilities),
      assets: round(assets),
      liabilities: round(liabilities),
    })
  }

  return points
}

export function projectIncome(params: IncomeParams): ProjectionPoint[] {
  const points: ProjectionPoint[] = []
  let assets = params.currentAssets
  const liabilities = params.currentLiabilities
  const surplus = params.newMonthlyIncome - params.currentMonthlyExpenses
  const monthlySavings = surplus * params.savingsRate

  points.push({
    month: 0,
    date: monthLabel(0),
    netWorth: round(assets - liabilities),
    assets: round(assets),
    liabilities: round(liabilities),
  })

  for (let m = 1; m <= params.projectionMonths; m++) {
    assets += monthlySavings
    points.push({
      month: m,
      date: monthLabel(m),
      netWorth: round(assets - liabilities),
      assets: round(assets),
      liabilities: round(liabilities),
    })
  }

  return points
}

export function projectExpense(params: ExpenseParams): ProjectionPoint[] {
  const points: ProjectionPoint[] = []
  let assets = params.currentAssets
  const liabilities = params.currentLiabilities
  const newExpenses = params.currentMonthlyExpenses - params.reductionAmount
  const surplus = params.currentMonthlyIncome - newExpenses
  const monthlySavings = surplus * params.savingsRate

  points.push({
    month: 0,
    date: monthLabel(0),
    netWorth: round(assets - liabilities),
    assets: round(assets),
    liabilities: round(liabilities),
  })

  for (let m = 1; m <= params.projectionMonths; m++) {
    assets += monthlySavings
    points.push({
      month: m,
      date: monthLabel(m),
      netWorth: round(assets - liabilities),
      assets: round(assets),
      liabilities: round(liabilities),
    })
  }

  return points
}

export function projectRetirement(params: RetirementParams): ProjectionPoint[] {
  const points: ProjectionPoint[] = []
  let assets = params.currentAssets
  let liabilities = params.currentLiabilities
  const yearsToRetirement = params.retirementAge - params.currentAge
  const totalYears = Math.max(yearsToRetirement + 30, 40) // Project 30 years into retirement
  const monthlyAccumRate = params.annualReturnRate / 12
  const monthlyRetiredRate = params.annualReturnRateRetired / 12

  points.push({
    month: 0,
    date: monthLabel(0),
    netWorth: round(assets - liabilities),
    assets: round(assets),
    liabilities: round(liabilities),
  })

  for (let y = 1; y <= totalYears; y++) {
    const m = y * 12
    if (y <= yearsToRetirement) {
      // Accumulation phase
      for (let mi = 0; mi < 12; mi++) {
        assets = assets * (1 + monthlyAccumRate) + params.monthlyContribution
      }
    } else {
      // Drawdown phase — expenses adjusted for inflation
      const yearsInRetirement = y - yearsToRetirement
      const inflatedExpenses = params.monthlyExpensesInRetirement *
        Math.pow(1 + params.inflationRate, yearsInRetirement)
      for (let mi = 0; mi < 12; mi++) {
        assets = assets * (1 + monthlyRetiredRate) - inflatedExpenses
      }
      if (assets < 0) assets = 0
    }

    // Assume liabilities stay constant (simplified)
    points.push({
      month: m,
      date: monthLabel(m),
      netWorth: round(assets - liabilities),
      assets: round(assets),
      liabilities: round(liabilities),
    })
  }

  return points
}

function runProjection(scenario: ScenarioParams): ProjectionPoint[] {
  switch (scenario.type) {
    case 'debt_payoff':
      return projectDebtPayoff(scenario.params)
    case 'savings':
      return projectSavings(scenario.params)
    case 'investment':
      return projectInvestment(scenario.params)
    case 'purchase':
      return projectPurchase(scenario.params)
    case 'income':
      return projectIncome(scenario.params)
    case 'expense':
      return projectExpense(scenario.params)
    case 'retirement':
      return projectRetirement(scenario.params)
  }
}

// ============================================================
// CRUD operations
// ============================================================

function toScenarioData(row: {
  id: string
  title: string
  description: string | null
  type: string
  parameters: string
  projections: string
  createdAt: Date
  updatedAt: Date
}): ScenarioData {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type as ScenarioType,
    parameters: JSON.parse(row.parameters) as ScenarioParams,
    projections: JSON.parse(row.projections) as ProjectionPoint[],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function createScenario(
  userId: string,
  title: string,
  description: string | null,
  scenario: ScenarioParams,
): Promise<ScenarioData> {
  const projections = runProjection(scenario)

  const row = await prisma.scenario.create({
    data: {
      userId,
      title,
      description,
      type: scenario.type,
      parameters: JSON.stringify(scenario),
      projections: JSON.stringify(projections),
    },
  })

  return toScenarioData(row)
}

export async function getScenarios(userId: string): Promise<ScenarioData[]> {
  const rows = await prisma.scenario.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  })

  return rows.map(toScenarioData)
}

export async function getScenario(userId: string, id: string): Promise<ScenarioData | null> {
  const row = await prisma.scenario.findFirst({
    where: { id, userId },
  })

  return row ? toScenarioData(row) : null
}

export async function deleteScenario(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.scenario.findFirst({
    where: { id, userId },
  })

  if (!existing) return false

  await prisma.scenario.delete({ where: { id } })
  return true
}

export async function compareScenarios(
  userId: string,
  ids: string[],
): Promise<ScenarioComparison> {
  const rows = await prisma.scenario.findMany({
    where: { id: { in: ids }, userId },
  })

  const scenarios = rows.map(row => {
    const data = toScenarioData(row)
    return {
      id: data.id,
      title: data.title,
      type: data.type,
      projections: data.projections,
    }
  })

  const maxMonths = Math.max(...scenarios.map(s =>
    s.projections.length > 0 ? s.projections[s.projections.length - 1].month : 0,
  ))

  return { scenarios, maxMonths }
}
