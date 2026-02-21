import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'

export function createChatTools(userId: string) {
  return {
    search_transactions: tool({
      description:
        "Search the user's transaction history. Call with NO parameters to get all recent transactions. Only add filters when the user explicitly asks.",
      inputSchema: z.object({
        query: z.string().optional().describe('Search by description text. Only set if user asks to search by name.'),
        startDate: z.string().optional().describe('Start date YYYY-MM-DD. Only set if user specifies dates.'),
        endDate: z.string().optional().describe('End date YYYY-MM-DD. Only set if user specifies dates.'),
        category: z.string().optional().describe('Only set if user asks about a specific category.'),
        limit: z.coerce.number().optional().default(20).describe('Max results.'),
      }),
      execute: async (params) => {
        try {
          const where: Prisma.TransactionWhereInput = { userId }

          if (params.query) {
            where.description = { contains: params.query }
          }
          if (params.category) {
            where.category = params.category === 'uncategorized' ? null : params.category
          }
          if (params.startDate || params.endDate) {
            where.transactionDate = {
              ...(params.startDate && { gte: new Date(params.startDate) }),
              ...(params.endDate && { lte: new Date(params.endDate) }),
            }
          }

          const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { transactionDate: 'desc' },
            take: params.limit,
            include: {
              statement: {
                select: { bankName: true, accountNumber: true },
              },
            },
          })

          const totalCredits = transactions
            .filter(t => t.transactionType === 'credit')
            .reduce((sum, t) => sum + t.amount, 0)
          const totalDebits = transactions
            .filter(t => t.transactionType === 'debit')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0)

          return {
            count: transactions.length,
            transactions: transactions.map(t => ({
              date: t.transactionDate.toISOString().split('T')[0],
              description: t.description,
              amount: t.amount,
              type: t.transactionType,
              category: t.category || 'Uncategorized',
              bank: t.statement.bankName,
              account: t.statement.accountNumber,
            })),
            summary: {
              totalCredits: `$${totalCredits.toFixed(2)}`,
              totalDebits: `$${totalDebits.toFixed(2)}`,
              netAmount: `$${(totalCredits - totalDebits).toFixed(2)}`,
            },
          }
        } catch (error) {
          console.error('search_transactions error:', error)
          return { error: 'Failed to search transactions', message: String(error) }
        }
      },
    }),

    get_account_summary: tool({
      description: 'Get a summary of all bank accounts with latest statement balances',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const accounts = await prisma.bankAccount.findMany({
            where: { userId },
            include: {
              statements: {
                orderBy: { periodEnd: 'desc' },
                take: 1,
                select: {
                  closingBalance: true,
                  periodEnd: true,
                  bankName: true,
                },
              },
            },
          })

          return {
            accounts: accounts.map(a => ({
              accountNumber: a.accountNumber,
              bank: a.statements[0]?.bankName || 'Unknown',
              latestBalance: a.statements[0]?.closingBalance ?? null,
              asOf: a.statements[0]?.periodEnd?.toISOString().split('T')[0] ?? null,
            })),
            totalAccounts: accounts.length,
          }
        } catch (error) {
          console.error('get_account_summary error:', error)
          return { error: 'Failed to get account summary', message: String(error) }
        }
      },
    }),

    get_cashflow: tool({
      description: 'Get cashflow data (income vs expenses) for a date range',
      inputSchema: z.object({
        startDate: z.string().describe('Start date (YYYY-MM-DD format)'),
        endDate: z.string().describe('End date (YYYY-MM-DD format)'),
      }),
      execute: async ({ startDate, endDate }) => {
        try {
          const transactions = await prisma.transaction.findMany({
            where: {
              userId,
              transactionDate: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            },
          })

          const income = transactions
            .filter(t => t.transactionType === 'credit')
            .reduce((sum, t) => sum + t.amount, 0)
          const expenses = transactions
            .filter(t => t.transactionType === 'debit')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0)

          return {
            period: { startDate, endDate },
            income: `$${income.toFixed(2)}`,
            expenses: `$${expenses.toFixed(2)}`,
            net: `$${(income - expenses).toFixed(2)}`,
            transactionCount: transactions.length,
          }
        } catch (error) {
          console.error('get_cashflow error:', error)
          return { error: 'Failed to get cashflow', message: String(error) }
        }
      },
    }),

    get_category_breakdown: tool({
      description: 'Get spending breakdown by category for a date range',
      inputSchema: z.object({
        startDate: z.string().optional().describe('Start date (YYYY-MM-DD format)'),
        endDate: z.string().optional().describe('End date (YYYY-MM-DD format)'),
      }),
      execute: async ({ startDate, endDate }) => {
        try {
          const where: Prisma.TransactionWhereInput = { userId }
          if (startDate || endDate) {
            where.transactionDate = {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            }
          }

          const transactions = await prisma.transaction.findMany({ where })

          const categories: Record<string, { count: number; total: number }> = {}
          for (const t of transactions) {
            const cat = t.category || 'uncategorized'
            if (!categories[cat]) categories[cat] = { count: 0, total: 0 }
            categories[cat].count++
            categories[cat].total += Math.abs(t.amount)
          }

          const sorted = Object.entries(categories)
            .map(([name, data]) => ({
              category: name,
              count: data.count,
              total: `$${data.total.toFixed(2)}`,
            }))
            .sort((a, b) => parseFloat(b.total.slice(1)) - parseFloat(a.total.slice(1)))

          return { categories: sorted, totalCategories: sorted.length }
        } catch (error) {
          console.error('get_category_breakdown error:', error)
          return { error: 'Failed to get category breakdown', message: String(error) }
        }
      },
    }),
  }
}
