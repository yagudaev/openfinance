import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export type StatementAccountType = 'chequing' | 'savings' | 'credit_card' | 'line_of_credit' | 'loan'

export interface BankStatementData {
  bankName: string
  accountName?: string
  accountNumber: string
  accountType?: StatementAccountType
  statementDate?: string
  periodStart: string
  periodEnd: string
  openingBalance: number
  closingBalance: number
  totalDeposits: number
  totalWithdrawals: number
  transactions: ExtractedTransaction[]
}

export interface ExtractedTransaction {
  date: string
  description: string
  amount: number
  balance?: number
  type: 'credit' | 'debit'
  referenceNumber?: string
}
