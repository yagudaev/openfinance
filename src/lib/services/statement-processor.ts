import { BankStatementData, openai } from '@/lib/openai'
import { prisma } from '@/lib/prisma'
import {
  ChatCompletionMessage,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions.mjs'
import { reconcileProvisionalTransactions } from '@/lib/services/plaid-sync'
import { categorizeTransactions } from '@/lib/services/transaction-categorizer'
import { readFile } from 'fs/promises'
import { getUploadFullPath } from '@/lib/upload-path'

// pdf-parse v1 has no proper ESM/TS types — use require
const pdfParse = require('pdf-parse')

const MAX_ITERATIONS = 3

/**
 * Process a statement by its database ID.
 * Reads the file from disk, extracts text, runs AI processing,
 * and updates the statement record with results.
 */
export async function processStatementById(
  statementId: string,
  userId: string,
) {
  const statement = await prisma.bankStatement.findFirst({
    where: { id: statementId, userId },
  })

  if (!statement) {
    throw new Error('Statement not found')
  }

  // Set status to processing
  await prisma.bankStatement.update({
    where: { id: statementId },
    data: { status: 'processing', errorMessage: null },
  })

  try {
    // Clean up previous processing data if reprocessing
    if (statement.isProcessed || statement.status === 'done' || statement.status === 'error') {
      await prisma.transaction.deleteMany({
        where: { statementId },
      })
      await prisma.balanceVerification.deleteMany({
        where: { statementId },
      })
    }

    // Read PDF from disk
    const fullPath = getUploadFullPath(statement.fileUrl)
    const pdfBuffer = await readFile(fullPath)
    const pdfData = await pdfParse(pdfBuffer)
    const pdfText: string = pdfData.text

    if (!pdfText || pdfText.trim().length === 0) {
      await prisma.bankStatement.update({
        where: { id: statementId },
        data: {
          status: 'error',
          errorMessage: 'Could not extract text from PDF. The file may be scanned/image-based.',
        },
      })
      throw new Error('Could not extract text from PDF. The file may be scanned/image-based.')
    }

    // Process with AI
    const result = await processStatement(
      pdfText,
      statement.fileName,
      statement.fileUrl,
      statement.fileSize,
      userId,
      statementId,
    )

    // Mark as done
    await prisma.bankStatement.update({
      where: { id: statementId },
      data: { status: 'done' },
    })

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Processing failed'

    // Only update to error if not already set (e.g. duplicate detection)
    const current = await prisma.bankStatement.findUnique({
      where: { id: statementId },
      select: { status: true },
    })
    if (current?.status === 'processing') {
      await prisma.bankStatement.update({
        where: { id: statementId },
        data: { status: 'error', errorMessage },
      })
    }

    throw error
  }
}

export async function processStatement(
  pdfText: string,
  fileName: string,
  filePath: string,
  fileSize: number,
  userId: string,
  existingStatementId?: string,
) {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  })
  const bankTimezone = settings?.bankTimezone || 'America/Vancouver'
  const aiModel = settings?.aiModel || 'gpt-4o-mini'

  const { statement, extractedData, verification } = await extractAndVerify(
    pdfText,
    bankTimezone,
    aiModel,
    fileName,
    filePath,
    fileSize,
    userId,
    existingStatementId,
  )

  // Reconcile provisional Plaid transactions that overlap with this statement
  try {
    const periodStart = new Date(extractedData.periodStart)
    const periodEnd = new Date(extractedData.periodEnd)
    await reconcileProvisionalTransactions(
      userId,
      periodStart,
      periodEnd,
      extractedData.accountNumber,
    )
  } catch (error) {
    console.error('Plaid reconciliation error:', error)
    // Non-fatal: statement processing still succeeds
  }

  // Auto-categorize extracted transactions so Dashboard/Expenses pages show data
  let categorizedCount = 0
  try {
    if (statement?.id) {
      const transactions = await prisma.transaction.findMany({
        where: { statementId: statement.id, userId },
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
  } catch (error) {
    console.error('Auto-categorization error:', error)
    // Non-fatal: transactions are still saved, just uncategorized
  }

  return {
    success: true,
    statement,
    transactionCount: extractedData.transactions?.length || 0,
    categorizedCount,
    isBalanced: verification.isBalanced,
    message: `Successfully processed ${extractedData.transactions?.length || 0} transactions (${categorizedCount} categorized)`,
  }
}

async function extractAndVerify(
  pdfText: string,
  bankTimezone: string,
  aiModel: string,
  fileName: string,
  filePath: string,
  fileSize: number,
  userId: string,
  reprocessStatementId?: string,
) {
  const prevMessages: ChatCompletionMessageParam[] = []
  let statement: any = null

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.info(`Iteration ${i + 1} of ${MAX_ITERATIONS}`)

    const { data: extractedData, llmResponse, filteredTransactions } =
      await extractDataFromText(pdfText, bankTimezone, aiModel, prevMessages)

    const existingStatementId =
      reprocessStatementId || (i > 0 ? statement?.id : undefined)

    statement = await saveStatement(
      extractedData,
      fileName,
      filePath,
      fileSize,
      userId,
      bankTimezone,
      existingStatementId,
    )
    prevMessages.push(llmResponse)

    if (i > 0) {
      await prisma.transaction.deleteMany({
        where: { statementId: statement.id },
      })
    }

    await saveTransactions(extractedData.transactions, userId, statement.id)
    const verification = await verifyBalance(extractedData, statement.id)

    const hasInvalidDates = filteredTransactions.count > 0
    const isSuccessful = verification.isBalanced && !hasInvalidDates

    if (isSuccessful) {
      return { statement, extractedData, verification }
    }

    const feedbackParts: string[] = []

    if (!verification.isBalanced) {
      feedbackParts.push(
        `The statement transactions are not balanced. ` +
        `There is a ${verification.discrepancy.toFixed(2)} discrepancy between the closing balance and ` +
        `the calculated closing balance from adding up all the transactions.`,
      )
    }

    if (hasInvalidDates) {
      feedbackParts.push(
        `${filteredTransactions.count} transaction(s) had invalid or missing dates and were filtered out. ` +
        `The affected transactions were: ${filteredTransactions.descriptions.slice(0, 5).join(', ')}${filteredTransactions.count > 5 ? '...' : ''}. ` +
        `Please ensure ALL transactions have valid dates in YYYY-MM-DD format.`,
      )
    }

    // On last iteration, accept the unbalanced result
    if (i === MAX_ITERATIONS - 1) {
      console.info('Max iterations reached, accepting unbalanced result')
      return { statement, extractedData, verification }
    }

    prevMessages.push({
      role: 'user',
      content: `${feedbackParts.join('\n\n')}

Please try again. Focus on the transactions specifically, ensuring each has a valid date.
Respond in JSON format like in the system prompt.`,
    })
  }

  // Should not reach here, but return last result as fallback
  throw new Error('Failed to extract and verify statement after maximum iterations.')
}

async function extractDataFromText(
  pdfText: string,
  bankTimezone: string,
  aiModel: string,
  prevMessages: ChatCompletionMessageParam[],
): Promise<{
  data: BankStatementData
  llmResponse: ChatCompletionMessage
  filteredTransactions: { count: number; descriptions: string[] }
}> {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: `Please extract all transaction data from this bank statement text.
The bank is in the ${bankTimezone} timezone, so please interpret all dates as being in that timezone.

EXTRACTED PDF TEXT:

${pdfText}`,
    },
    ...prevMessages,
  ]

  const completion = await openai.chat.completions.create({
    model: aiModel,
    messages: [
      { role: 'system', content: getSystemPrompt(bankTimezone) },
      ...messages,
    ],
    response_format: { type: 'json_object' },
  })

  const llmResponse = completion.choices[0]?.message
  const data = JSON.parse(llmResponse.content || '{}')

  if (data.status === 'error') {
    throw new Error(
      `Unable to process statement: ${data.message || 'The statement format is not recognized.'}`,
    )
  }

  if (!data.periodStart || !data.periodEnd) {
    throw new Error('Failed to extract statement period dates.')
  }

  if (data.openingBalance == null) {
    throw new Error('Failed to extract opening balance from statement.')
  }

  if (data.closingBalance == null) {
    throw new Error('Failed to extract closing balance from statement.')
  }

  if (data.statementDate) {
    data.statementDate = formatDateString(data.statementDate) || undefined
  }

  const formattedPeriodStart = formatDateString(data.periodStart)
  const formattedPeriodEnd = formatDateString(data.periodEnd)

  if (!formattedPeriodStart || !formattedPeriodEnd) {
    throw new Error(
      `Invalid period dates: periodStart: "${data.periodStart}", periodEnd: "${data.periodEnd}"`,
    )
  }

  data.periodStart = formattedPeriodStart
  data.periodEnd = formattedPeriodEnd

  const filteredTransactions: { count: number; descriptions: string[] } = {
    count: 0,
    descriptions: [],
  }

  if (data.transactions) {
    const originalCount = data.transactions.length
    const transactionsWithDates = data.transactions.map(
      (tx: BankStatementData['transactions'][0]) => ({
        ...tx,
        date: formatDateString(tx.date),
      }),
    )

    data.transactions = transactionsWithDates.filter(
      (tx: BankStatementData['transactions'][0] & { date: string | null }) => {
        if (!tx.date) {
          filteredTransactions.descriptions.push(tx.description || 'unknown')
          return false
        }
        return true
      },
    ) as BankStatementData['transactions']

    filteredTransactions.count = originalCount - data.transactions.length
  }

  return { data: data as BankStatementData, llmResponse, filteredTransactions }
}

function formatDateString(dateString: string | null | undefined): string | null {
  if (!dateString || dateString.trim() === '') return null

  const datePattern = /^\d{4}-\d{2}-\d{2}/
  if (!datePattern.test(dateString)) return null

  const datePart = dateString.split('T')[0]
  const parts = datePart.split('-')
  if (parts.length !== 3) return null

  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)

  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }

  return datePart
}

async function saveStatement(
  data: BankStatementData,
  fileName: string,
  filePath: string,
  fileSize: number,
  userId: string,
  bankTimezone: string,
  existingStatementId?: string,
) {
  const bankAccountId = await getOrCreateBankAccountId(
    userId,
    data.accountNumber,
    data.bankName || 'Unknown Bank',
  )

  if (existingStatementId) {
    return prisma.bankStatement.update({
      where: { id: existingStatementId },
      data: {
        bankAccountId,
        bankName: data.bankName || 'Unknown Bank',
        accountNumber: data.accountNumber,
        statementDate: new Date(data.statementDate || data.periodEnd),
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        openingBalance: data.openingBalance,
        closingBalance: data.closingBalance,
        totalDeposits: data.totalDeposits,
        totalWithdrawals: data.totalWithdrawals,
        status: 'done',
        isProcessed: true,
        processedAt: new Date(),
        processingTimezone: bankTimezone,
      },
    })
  }

  // Check for duplicate (only when creating a new statement, not reprocessing)
  const existing = await prisma.bankStatement.findFirst({
    where: {
      userId,
      accountNumber: data.accountNumber,
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
    },
  })

  if (existing) {
    if (existing.isProcessed) {
      throw new Error(
        `Duplicate statement detected: A statement for account ${data.accountNumber} ` +
        `from ${data.periodStart} to ${data.periodEnd} already exists (${existing.fileName}).`,
      )
    }

    return prisma.bankStatement.update({
      where: { id: existing.id },
      data: {
        bankAccountId,
        bankName: data.bankName || 'Unknown Bank',
        accountNumber: data.accountNumber,
        statementDate: new Date(data.statementDate || data.periodEnd),
        openingBalance: data.openingBalance,
        closingBalance: data.closingBalance,
        totalDeposits: data.totalDeposits,
        totalWithdrawals: data.totalWithdrawals,
        status: 'done',
        isProcessed: true,
        processedAt: new Date(),
        processingTimezone: bankTimezone,
      },
    })
  }

  return prisma.bankStatement.create({
    data: {
      userId,
      bankAccountId,
      fileName,
      fileUrl: filePath,
      fileSize,
      bankName: data.bankName || 'Unknown Bank',
      accountNumber: data.accountNumber,
      statementDate: new Date(data.statementDate || data.periodEnd),
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
      openingBalance: data.openingBalance,
      closingBalance: data.closingBalance,
      totalDeposits: data.totalDeposits,
      totalWithdrawals: data.totalWithdrawals,
      status: 'done',
      isProcessed: true,
      processedAt: new Date(),
      processingTimezone: bankTimezone,
    },
  })
}

async function getOrCreateBankAccountId(
  userId: string,
  accountNumber: string | undefined,
  bankName: string,
): Promise<string | null> {
  if (!accountNumber) return null

  const existing = await prisma.bankAccount.findUnique({
    where: {
      userId_accountNumber: { userId, accountNumber },
    },
  })

  if (existing) return existing.id

  const created = await prisma.bankAccount.create({
    data: {
      userId,
      accountNumber,
      nickname: accountNumber,
      bankName,
      currency: 'CAD',
    },
  })

  return created.id
}

async function saveTransactions(
  transactions: BankStatementData['transactions'],
  userId: string,
  statementId: string,
) {
  if (!transactions || transactions.length === 0) return

  const data = transactions.map((tx, index) => ({
    userId,
    statementId,
    transactionDate: new Date(tx.date),
    description: tx.description,
    amount: tx.amount,
    balance: tx.balance || null,
    transactionType: tx.type,
    referenceNumber: tx.referenceNumber || null,
    sortOrder: index,
  }))

  await prisma.transaction.createMany({ data })
}

async function verifyBalance(data: BankStatementData, statementId: string) {
  const calculatedTotal = calculateClosingBalance(data.openingBalance, data.transactions)
  const isBalanced = Math.abs(calculatedTotal - data.closingBalance) < 0.01
  const discrepancy = isBalanced ? 0 : calculatedTotal - data.closingBalance
  const verificationStatus = isBalanced ? 'verified' : 'unbalanced'

  await prisma.balanceVerification.upsert({
    where: { statementId },
    create: {
      statementId,
      calculatedOpeningBalance: data.openingBalance,
      calculatedClosingBalance: calculatedTotal,
      statementOpeningBalance: data.openingBalance,
      statementClosingBalance: data.closingBalance,
      isBalanced,
      discrepancyAmount: discrepancy,
      notes: isBalanced
        ? 'Statement balanced successfully'
        : `Discrepancy of ${discrepancy.toFixed(2)} detected`,
    },
    update: {
      calculatedClosingBalance: calculatedTotal,
      isBalanced,
      discrepancyAmount: discrepancy,
      notes: isBalanced
        ? 'Statement balanced successfully'
        : `Discrepancy of ${discrepancy.toFixed(2)} detected`,
    },
  })

  await prisma.bankStatement.update({
    where: { id: statementId },
    data: { verificationStatus, discrepancyAmount: discrepancy },
  })

  return { isBalanced, discrepancy }
}

function calculateClosingBalance(
  openingBalance: number,
  transactions: BankStatementData['transactions'],
): number {
  if (!transactions) return openingBalance
  return transactions.reduce((sum, tx) => sum + tx.amount, openingBalance)
}

function getSystemPrompt(timezone: string): string {
  return `You are a financial data extraction expert. Extract all transaction data from the bank statement text and return it as structured JSON.

IMPORTANT: The bank operates in the ${timezone} timezone. All dates should be interpreted as being in this timezone.

Return the data in this exact format:
{
  "bankName": "string",
  "accountNumber": "string (full account number as shown on statement)",
  "statementDate": "YYYY-MM-DD (optional - if not clearly visible, omit this field)",
  "periodStart": "YYYY-MM-DD",
  "periodEnd": "YYYY-MM-DD",
  "openingBalance": number,
  "closingBalance": number,
  "totalDeposits": number,
  "totalWithdrawals": number,
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": number (positive for credits, negative for debits),
      "balance": number (if available),
      "type": "credit" or "debit",
      "referenceNumber": "string (if available)"
    }
  ]
}

CRITICAL extraction rules:
- Extract ONLY actual transactions (debits and credits). Do NOT include "Opening balance", "Closing balance", or summary/total lines as transactions
- The opening balance + sum of all transaction amounts must equal the closing balance
- Use the exact values from the text for all numbers (amounts, balances, dates)
- Extract ALL transactions visible in the statement
- Ensure dates are in YYYY-MM-DD format
- Amount should be positive for credits/deposits and negative for debits/withdrawals
- If statementDate is not clearly visible, omit it (periodEnd will be used as fallback)
- Calculate totals if not explicitly stated
- Include the full account number as shown on the statement`
}
