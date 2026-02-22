export type OwnershipFilter = 'combined' | 'business' | 'personal'

export interface DashboardStats {
  monthlyIncome: number
  monthlyExpenses: number
  prevMonthIncome: number
  prevMonthExpenses: number
  changeIncomePercent: number | null
  changeExpensesPercent: number | null
}

export interface CashflowDataPoint {
  monthLabel: string
  income: number
  expenses: number
  cashflow: number
}

export interface DashboardData {
  stats: DashboardStats
  cashflowData: CashflowDataPoint[]
  totalTransactions: number
}

export function formatCurrency(amount: number, currency = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
