export type AccountType = 'asset' | 'liability'

export type AccountCategory =
  | 'checking'
  | 'savings'
  | 'investment'
  | 'crypto'
  | 'real-estate'
  | 'vehicle'
  | 'credit-card'
  | 'loan'
  | 'mortgage'
  | 'other'

export const ASSET_CATEGORIES: AccountCategory[] = [
  'checking',
  'savings',
  'investment',
  'crypto',
  'real-estate',
  'vehicle',
  'other',
]

export const LIABILITY_CATEGORIES: AccountCategory[] = [
  'credit-card',
  'loan',
  'mortgage',
  'other',
]

export const CATEGORY_LABELS: Record<AccountCategory, string> = {
  'checking': 'Checking',
  'savings': 'Savings',
  'investment': 'Investment',
  'crypto': 'Crypto',
  'real-estate': 'Real Estate',
  'vehicle': 'Vehicle',
  'credit-card': 'Credit Card',
  'loan': 'Loan',
  'mortgage': 'Mortgage',
  'other': 'Other',
}

export interface NetWorthAccountData {
  id: string
  name: string
  accountType: AccountType
  category: AccountCategory
  currentBalance: number
  currency: string
  isManual: boolean
  bankAccountId: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface NetWorthSnapshotData {
  id: string
  date: string
  totalAssets: number
  totalLiabilities: number
  netWorth: number
}

export interface NetWorthSummary {
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  monthOverMonthChange: number | null
  monthOverMonthPercent: number | null
  yearOverYearChange: number | null
  yearOverYearPercent: number | null
}

export interface AccountBreakdown {
  assets: NetWorthAccountData[]
  liabilities: NetWorthAccountData[]
  totalAssets: number
  totalLiabilities: number
}

export type HistoryPeriod = 'monthly' | 'quarterly' | 'yearly'

export function formatCurrency(amount: number, currency = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}
