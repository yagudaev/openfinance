import { tool } from 'ai'
import { z } from 'zod'
import { readFile, stat } from 'fs/promises'
import { join, extname } from 'path'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'

import {
  calculateFederalTax,
  calculateCompoundGrowth,
  safeEvaluate,
  getRRSPInfo,
  getTFSAInfo,
} from '@/lib/chat/finance-tools'
import { saveMemory, recallMemories, searchMemories, deleteMemory, MEMORY_CATEGORIES, type MemoryCategory } from '@/lib/chat/memory'
import { processStatement } from '@/lib/services/statement-processor'
import { categorizeTransactions } from '@/lib/services/transaction-categorizer'

// pdf-parse v1 has no proper ESM/TS types — use require
const pdfParse = require('pdf-parse')

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

    get_settings: tool({
      description: 'Get the current user settings including fiscal year, timezone, AI model, and personal context',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const settings = await prisma.userSettings.findUnique({
            where: { userId },
          })

          if (!settings) {
            return { error: 'No settings found. User has default settings.' }
          }

          const MONTHS = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
          ]

          return {
            fiscalYear: {
              endMonth: MONTHS[settings.fiscalYearEndMonth - 1],
              endDay: settings.fiscalYearEndDay,
            },
            timezone: {
              bank: settings.bankTimezone,
              display: settings.userTimezone,
            },
            ai: {
              model: settings.aiModel,
              personalContext: settings.aiContext || 'Not set',
            },
          }
        } catch (error) {
          console.error('get_settings error:', error)
          return { error: 'Failed to get settings', message: String(error) }
        }
      },
    }),

    update_settings: tool({
      description: 'Update user settings. Only pass the fields you want to change. Valid AI models: "openai/gpt-4o-mini", "openai/gpt-4o", "openrouter/cerebras/auto", "openrouter/google/gemini-2.5-flash-preview". Fiscal year end month is 1-12. Timezones use IANA format (e.g. "America/Toronto").',
      inputSchema: z.object({
        fiscalYearEndMonth: z.number().min(1).max(12).optional().describe('Fiscal year end month (1=January, 12=December)'),
        fiscalYearEndDay: z.number().min(1).max(31).optional().describe('Fiscal year end day'),
        bankTimezone: z.string().optional().describe('Bank timezone in IANA format (e.g. America/Vancouver)'),
        userTimezone: z.string().optional().describe('Display timezone in IANA format (e.g. America/Toronto)'),
        aiModel: z.string().optional().describe('AI model identifier (e.g. "openrouter/cerebras/auto", "openai/gpt-4o-mini")'),
        aiContext: z.string().optional().describe('Personal context about the user for better AI responses'),
      }),
      execute: async (params) => {
        try {
          const data: Record<string, unknown> = {}
          if (params.fiscalYearEndMonth !== undefined) data.fiscalYearEndMonth = params.fiscalYearEndMonth
          if (params.fiscalYearEndDay !== undefined) data.fiscalYearEndDay = params.fiscalYearEndDay
          if (params.bankTimezone !== undefined) data.bankTimezone = params.bankTimezone
          if (params.userTimezone !== undefined) data.userTimezone = params.userTimezone
          if (params.aiModel !== undefined) {
            const validModels = [
              'openai/gpt-4o-mini',
              'openai/gpt-4o',
              'openrouter/cerebras/auto',
              'openrouter/google/gemini-2.5-flash-preview',
            ]
            if (!validModels.includes(params.aiModel)) {
              return { error: `Invalid AI model. Must be one of: ${validModels.join(', ')}` }
            }
            data.aiModel = params.aiModel
          }
          if (params.aiContext !== undefined) data.aiContext = params.aiContext

          if (Object.keys(data).length === 0) {
            return { error: 'No settings to update. Provide at least one field.' }
          }

          const updated = await prisma.userSettings.upsert({
            where: { userId },
            update: data,
            create: { userId, ...data },
          })

          const MONTHS = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
          ]

          return {
            success: true,
            updatedFields: Object.keys(data),
            currentSettings: {
              fiscalYear: {
                endMonth: MONTHS[updated.fiscalYearEndMonth - 1],
                endDay: updated.fiscalYearEndDay,
              },
              timezone: {
                bank: updated.bankTimezone,
                display: updated.userTimezone,
              },
              ai: {
                model: updated.aiModel,
                personalContext: updated.aiContext || 'Not set',
              },
            },
          }
        } catch (error) {
          console.error('update_settings error:', error)
          return { error: 'Failed to update settings', message: String(error) }
        }
      },
    }),

    calculate_tax: tool({
      description: 'Calculate Canadian federal income tax for a given annual income. Returns tax brackets, total tax, effective and marginal rates.',
      inputSchema: z.object({
        income: z.number().describe('Annual income in CAD'),
      }),
      execute: async ({ income }) => {
        const result = calculateFederalTax(income)
        return {
          income: `$${income.toLocaleString()}`,
          ...result,
          effectiveRate: `${(result.effectiveRate * 100).toFixed(1)}%`,
          marginalRate: `${(result.marginalRate * 100).toFixed(1)}%`,
          totalTax: `$${result.totalTax.toLocaleString()}`,
        }
      },
    }),

    calculate_compound_growth: tool({
      description: 'Calculate compound investment growth over time. Returns year-by-year projections with contributions and growth.',
      inputSchema: z.object({
        principal: z.number().describe('Initial investment amount'),
        monthlyContribution: z.number().describe('Monthly contribution amount'),
        annualRate: z.number().describe('Expected annual return rate as decimal (e.g., 0.07 for 7%)'),
        years: z.number().describe('Number of years to project'),
      }),
      execute: async (params) => {
        return calculateCompoundGrowth(params)
      },
    }),

    calculate_rrsp: tool({
      description: 'Get RRSP contribution information for a given income level. Returns contribution room, estimated tax refund, and marginal rate.',
      inputSchema: z.object({
        income: z.number().describe('Annual earned income in CAD'),
      }),
      execute: async ({ income }) => {
        return getRRSPInfo(income)
      },
    }),

    calculate_tfsa: tool({
      description: 'Get TFSA contribution limit and tax-free growth information.',
      inputSchema: z.object({}),
      execute: async () => {
        return getTFSAInfo()
      },
    }),

    evaluate_expression: tool({
      description: 'Safely evaluate a mathematical expression using mathjs. Use for custom calculations that don\'t fit other tools.',
      inputSchema: z.object({
        expression: z.string().describe('Mathematical expression to evaluate (e.g., "50000 * 0.18", "compound interest formula")'),
      }),
      execute: async ({ expression }) => {
        return safeEvaluate(expression)
      },
    }),

    save_memory: tool({
      description:
        'Save an important fact about the user for future conversations. Use this proactively when the user shares financial details, goals, preferences, or personal context.',
      inputSchema: z.object({
        key: z.string().describe('Short identifier for this memory (e.g. "annual_income", "filing_status")'),
        value: z.string().describe('The fact to remember (e.g. "User earns $120k/year as a freelance developer")'),
        category: z.enum([
          'financial_situation',
          'goals',
          'preferences',
          'tax_info',
          'business_info',
          'general',
        ]).describe('Category for organizing this memory'),
      }),
      execute: async ({ key, value, category }) => {
        try {
          await saveMemory(userId, key, value, category as MemoryCategory)
          return {
            success: true,
            message: `Remembered: ${key}`,
            category: MEMORY_CATEGORIES[category as MemoryCategory],
          }
        } catch (error) {
          console.error('save_memory error:', error)
          return { error: 'Failed to save memory', message: String(error) }
        }
      },
    }),

    recall_memory: tool({
      description:
        'Retrieve saved memories about the user. Call with no parameters to get all memories, or filter by category.',
      inputSchema: z.object({
        category: z.enum([
          'financial_situation',
          'goals',
          'preferences',
          'tax_info',
          'business_info',
          'general',
        ]).optional().describe('Filter by category. Omit to get all memories.'),
      }),
      execute: async ({ category }) => {
        try {
          const memories = await recallMemories(userId, category as MemoryCategory | undefined)

          if (memories.length === 0) {
            return {
              count: 0,
              message: category
                ? `No memories found in category "${MEMORY_CATEGORIES[category as MemoryCategory]}"`
                : 'No memories saved yet',
            }
          }

          return {
            count: memories.length,
            memories: memories.map(m => ({
              key: m.key,
              value: m.value,
              category: m.category,
              categoryLabel: MEMORY_CATEGORIES[m.category as MemoryCategory] ?? m.category,
              lastUpdated: m.updatedAt.toISOString().split('T')[0],
            })),
          }
        } catch (error) {
          console.error('recall_memory error:', error)
          return { error: 'Failed to recall memories', message: String(error) }
        }
      },
    }),

    search_memory: tool({
      description:
        'Search saved memories by keyword. Searches across both keys and values. Use this when you need to find a specific memory but don\'t know its exact key or category.',
      inputSchema: z.object({
        query: z.string().describe('Keyword to search for across memory keys and values (case-insensitive)'),
      }),
      execute: async ({ query }) => {
        try {
          const memories = await searchMemories(userId, query)

          if (memories.length === 0) {
            return {
              count: 0,
              message: `No memories found matching "${query}"`,
            }
          }

          return {
            count: memories.length,
            memories: memories.map(m => ({
              key: m.key,
              value: m.value,
              category: m.category,
              categoryLabel: MEMORY_CATEGORIES[m.category as MemoryCategory] ?? m.category,
              lastUpdated: m.updatedAt.toISOString().split('T')[0],
            })),
          }
        } catch (error) {
          console.error('search_memory error:', error)
          return { error: 'Failed to search memories', message: String(error) }
        }
      },
    }),

    delete_memory: tool({
      description:
        'Delete a specific saved memory by its key. Use this when the user asks to forget something or when information is no longer accurate.',
      inputSchema: z.object({
        key: z.string().describe('The key of the memory to delete'),
      }),
      execute: async ({ key }) => {
        try {
          const result = await deleteMemory(userId, key)
          if (result.count === 0) {
            return { success: false, message: `No memory found with key "${key}"` }
          }
          return { success: true, message: `Forgot: ${key}` }
        } catch (error) {
          console.error('delete_memory error:', error)
          return { error: 'Failed to delete memory', message: String(error) }
        }
      },
    }),

    read_file: tool({
      description:
        'Read the contents of an uploaded file. Use this to read text files (markdown, CSV, TXT), extract text from PDFs, or examine file contents before deciding how to process them. For bank statement PDFs, prefer using process_statements instead.',
      inputSchema: z.object({
        filePath: z.string().describe(
          'File path relative to data/uploads/ (from the [Attached file: name (path)] reference)',
        ),
      }),
      execute: async ({ filePath }) => {
        const MAX_CHARS = 50_000
        const fileName = filePath.split('/').pop() || filePath
        const ext = extname(fileName).toLowerCase()

        try {
          const fullPath = join(process.cwd(), 'data', 'uploads', filePath)

          // Image files — cannot read as text
          if (['.jpg', '.jpeg', '.png'].includes(ext)) {
            return {
              fileName,
              fileType: ext.slice(1),
              error: 'This is an image file. I can see it was uploaded but cannot read image contents as text.',
            }
          }

          // Excel files — suggest CSV export
          if (['.xlsx', '.xls'].includes(ext)) {
            return {
              fileName,
              fileType: ext.slice(1),
              error: 'This is an Excel file. For best results, export it as CSV first.',
            }
          }

          // PDF files — extract text with pdf-parse
          if (ext === '.pdf') {
            const pdfBuffer = await readFile(fullPath)
            const pdfData = await pdfParse(pdfBuffer)
            const text: string = pdfData.text || ''

            if (!text.trim()) {
              return {
                fileName,
                fileType: 'pdf',
                error: 'Could not extract text from PDF. The file may be scanned/image-based.',
              }
            }

            const content = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text
            return {
              fileName,
              fileType: 'pdf',
              content,
              charCount: text.length,
              truncated: text.length > MAX_CHARS,
            }
          }

          // Text-based files (md, txt, csv, and anything else)
          const raw = await readFile(fullPath, 'utf-8')
          const content = raw.length > MAX_CHARS ? raw.slice(0, MAX_CHARS) : raw
          return {
            fileName,
            fileType: ext ? ext.slice(1) : 'unknown',
            content,
            charCount: raw.length,
            truncated: raw.length > MAX_CHARS,
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return { fileName, fileType: ext ? ext.slice(1) : 'unknown', error: message }
        }
      },
    }),

    process_statements: tool({
      description:
        'Process one or more uploaded bank statement PDF files. Extracts transactions from the PDFs using AI, saves them to the database, and categorizes them. Use this when the user uploads PDF files and asks to process their bank statements, import transactions, or mentions uploaded statement files. The filePaths should come from [Attached file: ...] references in the user message.',
      inputSchema: z.object({
        filePaths: z.array(z.string()).describe(
          'Array of file paths relative to data/uploads/ (e.g. "attachments/userId/timestamp_file.pdf"). These come from the [Attached file: name (path)] references in the user message.',
        ),
      }),
      execute: async ({ filePaths }) => {
        const results: Array<{
          fileName: string
          success: boolean
          transactionCount?: number
          categorized?: number
          isBalanced?: boolean
          bankName?: string
          periodStart?: string
          periodEnd?: string
          error?: string
        }> = []

        for (const filePath of filePaths) {
          const fileName = filePath.split('/').pop() || filePath

          try {
            // Read PDF from disk
            const fullPath = join(process.cwd(), 'data', 'uploads', filePath)
            const pdfBuffer = await readFile(fullPath)
            const fileStats = await stat(fullPath)

            // Extract text from PDF
            const pdfData = await pdfParse(pdfBuffer)
            const pdfText: string = pdfData.text

            if (!pdfText || pdfText.trim().length === 0) {
              results.push({
                fileName,
                success: false,
                error: 'Could not extract text from PDF. The file may be scanned/image-based.',
              })
              continue
            }

            // Process the statement
            const result = await processStatement(
              pdfText,
              fileName,
              filePath,
              fileStats.size,
              userId,
            )

            // Categorize the extracted transactions
            let categorizedCount = 0
            if (result.statement?.id && result.transactionCount > 0) {
              const transactions = await prisma.transaction.findMany({
                where: { statementId: result.statement.id, userId },
                select: { id: true },
              })

              if (transactions.length > 0) {
                const catResult = await categorizeTransactions(
                  transactions.map(t => t.id),
                  userId,
                )
                categorizedCount = catResult.categorized
              }
            }

            // Fetch statement details for the response
            const statement = result.statement
              ? await prisma.bankStatement.findUnique({
                  where: { id: result.statement.id },
                  select: {
                    bankName: true,
                    periodStart: true,
                    periodEnd: true,
                  },
                })
              : null

            results.push({
              fileName,
              success: true,
              transactionCount: result.transactionCount,
              categorized: categorizedCount,
              isBalanced: result.isBalanced,
              bankName: statement?.bankName || undefined,
              periodStart: statement?.periodStart?.toISOString().split('T')[0],
              periodEnd: statement?.periodEnd?.toISOString().split('T')[0],
            })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            results.push({
              fileName,
              success: false,
              error: message,
            })
          }
        }

        const successCount = results.filter(r => r.success).length
        const totalTransactions = results.reduce(
          (sum, r) => sum + (r.transactionCount || 0),
          0,
        )

        return {
          processed: successCount,
          failed: results.length - successCount,
          totalTransactions,
          results,
        }
      },
    }),
  }
}
