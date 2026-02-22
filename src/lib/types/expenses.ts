export type PeriodKey =
  | 'this-month'
  | 'last-month'
  | 'ytd'
  | 'last-12-months'
  | 'custom'

export interface MerchantSummary {
  merchant: string
  total: number
  count: number
}

export interface CategorySummary {
  category: string
  total: number
  count: number
  percentage: number
  prevTotal: number
  changePercent: number
  topMerchants: MerchantSummary[]
}

export interface ExpenseOverviewData {
  type: 'overview'
  totalSpending: number
  prevTotalSpending: number
  categories: CategorySummary[]
  period: PeriodKey
  startDate: string
  endDate: string
}

export interface TransactionDetail {
  id: string
  date: string
  description: string
  amount: number
  balance: number | null
  category: string | null
  transactionType: string
  bankName: string
  accountNumber: string | null
  statementFileName: string | null
  source: string
}

export interface MerchantDetail {
  merchant: string
  total: number
  count: number
  transactions: TransactionDetail[]
}

export interface CategoryDetailData {
  type: 'category-detail'
  category: string
  total: number
  prevTotal: number
  transactionCount: number
  merchants: MerchantDetail[]
}

export type ExpenseBreakdownResponse = ExpenseOverviewData | CategoryDetailData

export const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'last-12-months', label: 'Last 12 Months' },
]

export const CATEGORY_COLORS: Record<string, string> = {
  'expense': '#3b82f6',
  'owner-pay': '#8b5cf6',
  'uncategorized': '#6b7280',
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'expense': 'Expenses',
    'owner-pay': 'Owner Pay',
    'uncategorized': 'Uncategorized',
  }
  return labels[category] ?? category
}
