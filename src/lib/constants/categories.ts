export const CATEGORIES = [
  { value: 'expense', label: 'Expense' },
  { value: 'owner-pay', label: 'Owner Pay' },
  { value: 'income', label: 'Income' },
  { value: 'internal-transfer', label: 'Internal Transfer' },
  { value: 'shareholder-loan', label: 'Shareholder Loan' },
] as const

export type CategoryValue = (typeof CATEGORIES)[number]['value']

export const CURRENCIES = ['CAD', 'USD'] as const
export type Currency = (typeof CURRENCIES)[number]
