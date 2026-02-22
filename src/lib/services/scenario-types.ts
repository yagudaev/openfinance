export type ScenarioType =
  | 'debt_payoff'
  | 'savings'
  | 'investment'
  | 'purchase'
  | 'income'
  | 'expense'
  | 'retirement'

export const SCENARIO_TYPE_LABELS: Record<ScenarioType, string> = {
  debt_payoff: 'Debt Payoff',
  savings: 'Savings Goal',
  investment: 'Investment',
  purchase: 'Major Purchase',
  income: 'Income Change',
  expense: 'Expense Reduction',
  retirement: 'Retirement',
}

export interface ProjectionPoint {
  month: number
  date: string // YYYY-MM label
  netWorth: number
  assets: number
  liabilities: number
}

export interface DebtPayoffParams {
  debts: {
    name: string
    balance: number
    interestRate: number // annual, as decimal e.g. 0.19
    minimumPayment: number
  }[]
  strategy: 'avalanche' | 'snowball' | 'custom'
  extraPayment: number // additional monthly payment beyond minimums
  customOrder?: string[] // debt names in custom payoff order
}

export interface SavingsParams {
  currentSavings: number
  monthlyContribution: number
  annualReturnRate: number // decimal e.g. 0.04
  goalAmount: number
  projectionMonths: number
}

export interface InvestmentParams {
  initialInvestment: number
  monthlyContribution: number
  annualReturnRate: number // decimal e.g. 0.07
  projectionYears: number
}

export interface PurchaseParams {
  purchaseAmount: number
  downPayment: number
  loanRate: number // annual, decimal
  loanTermMonths: number
  currentNetWorth: number
  currentAssets: number
  currentLiabilities: number
  monthlyIncome: number
  monthlyExpenses: number
}

export interface IncomeParams {
  currentMonthlyIncome: number
  newMonthlyIncome: number
  currentMonthlyExpenses: number
  currentNetWorth: number
  currentAssets: number
  currentLiabilities: number
  savingsRate: number // decimal, portion of surplus saved
  projectionMonths: number
}

export interface ExpenseParams {
  currentMonthlyExpenses: number
  reductionAmount: number // monthly reduction
  currentMonthlyIncome: number
  currentNetWorth: number
  currentAssets: number
  currentLiabilities: number
  savingsRate: number // decimal
  projectionMonths: number
}

export interface RetirementParams {
  currentAge: number
  retirementAge: number
  currentNetWorth: number
  currentAssets: number
  currentLiabilities: number
  monthlyContribution: number
  annualReturnRate: number // decimal
  annualReturnRateRetired: number // more conservative rate post-retirement
  monthlyExpensesInRetirement: number
  inflationRate: number // decimal e.g. 0.02
}

export type ScenarioParams =
  | { type: 'debt_payoff'; params: DebtPayoffParams }
  | { type: 'savings'; params: SavingsParams }
  | { type: 'investment'; params: InvestmentParams }
  | { type: 'purchase'; params: PurchaseParams }
  | { type: 'income'; params: IncomeParams }
  | { type: 'expense'; params: ExpenseParams }
  | { type: 'retirement'; params: RetirementParams }

export interface ScenarioData {
  id: string
  title: string
  description: string | null
  type: ScenarioType
  parameters: ScenarioParams
  projections: ProjectionPoint[]
  createdAt: string
  updatedAt: string
}

export interface ScenarioComparison {
  scenarios: {
    id: string
    title: string
    type: ScenarioType
    projections: ProjectionPoint[]
  }[]
  maxMonths: number
}
