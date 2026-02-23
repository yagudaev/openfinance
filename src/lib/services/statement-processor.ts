import { BankStatementData, StatementAccountType, openai } from '@/lib/openai'
import { prisma } from '@/lib/prisma'
import {
  ChatCompletionMessage,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions.mjs'
import { reconcileProvisionalTransactions } from '@/lib/services/plaid-sync'
import { categorizeTransactions } from '@/lib/services/transaction-categorizer'
import { recomputeDailyNetWorth } from '@/lib/services/daily-net-worth'
import { readFile } from 'fs/promises'
import { getUploadFullPath } from '@/lib/upload-path'

// pdf-parse v1 has no proper ESM/TS types — use require
const pdfParse = require('pdf-parse')

const VALID_ACCOUNT_TYPES: StatementAccountType[] = [
  'chequing',
  'savings',
  'credit_card',
  'line_of_credit',
  'loan',
]

const MAX_ITERATIONS = 15

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
  const processingModelId = settings?.processingModel ?? 'openai/gpt-4o-mini'
  // Strip the openai/ prefix — statement processor uses the OpenAI SDK directly
  const aiModel = processingModelId.replace('openai/', '')

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

  // Auto-sync NetWorthAccount so net worth page reflects bank statement balances
  try {
    if (statement?.bankAccountId) {
      await syncNetWorthAccount(
        userId,
        statement.bankAccountId,
        extractedData.closingBalance,
        extractedData.bankName,
        extractedData.accountType,
        extractedData.accountName,
      )
    }
  } catch (error) {
    console.error('Net worth account sync error:', error)
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

  // Recompute daily net worth snapshots from transaction history
  try {
    await recomputeDailyNetWorth(userId)
  } catch (error) {
    console.error('Daily net worth recomputation error:', error)
    // Non-fatal: statement processing still succeeds
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
      await extractDataFromText(pdfText, bankTimezone, aiModel, prevMessages, fileName)

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

    await saveTransactions(extractedData.transactions, userId, statement.id, extractedData.accountType)
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

              Please try again. Do your best to extract the data even from slightly blurry images.
              Focus on the transactions specifically, ensuring each has a valid date.

              Respond in JSON format like in the system prompt.`,
    })
  }

  // Should not reach here, but return last result as fallback
  throw new Error('Failed to extract and verify statement after maximum iterations.')
}

/**
 * Infer account type from PDF text and filename using keyword heuristics.
 * Used as a fallback when the AI doesn't return a valid accountType.
 */
function inferAccountTypeFromText(
  pdfText: string,
  fileName: string,
): StatementAccountType {
  const text = pdfText.toLowerCase()
  const file = fileName.toLowerCase()

  // Credit card indicators (check first — most common misclassification)
  const creditCardPatterns = [
    /credit\s*card/,
    /mastercard/,
    /\bvisa\b/,
    /\bamex\b/,
    /american\s*express/,
    /minimum\s*payment/,
    /payment\s*due\s*date/,
    /credit\s*limit/,
    /available\s*credit/,
    /cash\s*advance/,
    /annual\s*fee/,
    /interest\s*rate/,
    /previous\s*balance/,
    /new\s*balance/,
    /statement\s*balance/,
    /purchase\s*interest/,
    /interest\s*charge/,
    /balance\s*owing/,
    /amount\s*owing/,
    /total\s*due/,
  ]

  for (const pattern of creditCardPatterns) {
    if (pattern.test(text) || pattern.test(file)) {
      return 'credit_card'
    }
  }

  // Line of credit indicators
  const locPatterns = [
    /line\s*of\s*credit/,
    /\bloc\b/,
    /heloc/,
  ]

  for (const pattern of locPatterns) {
    if (pattern.test(text) || pattern.test(file)) {
      return 'line_of_credit'
    }
  }

  // Loan / mortgage indicators
  const loanPatterns = [
    /\bmortgage\b/,
    /\bloan\b/,
    /amortization/,
    /principal\s*balance/,
  ]

  for (const pattern of loanPatterns) {
    if (pattern.test(text) || pattern.test(file)) {
      return 'loan'
    }
  }

  // Savings indicators
  const savingsPatterns = [
    /savings?\s*account/,
    /\bsavings\b/,
    /high.interest\s*savings/,
    /\btfsa\b/,
    /tax.free\s*savings/,
  ]

  for (const pattern of savingsPatterns) {
    if (pattern.test(text) || pattern.test(file)) {
      return 'savings'
    }
  }

  return 'chequing'
}

/**
 * Validate and normalize the account type from AI output.
 * Falls back to heuristic-based inference if the AI returned an
 * invalid or missing value.
 */
function normalizeAccountType(
  aiAccountType: string | undefined,
  pdfText: string,
  fileName: string,
): StatementAccountType {
  if (
    aiAccountType
    && VALID_ACCOUNT_TYPES.includes(aiAccountType as StatementAccountType)
  ) {
    return aiAccountType as StatementAccountType
  }

  // AI returned invalid or missing accountType — fall back to heuristic
  console.info(
    `AI returned invalid accountType "${aiAccountType}", inferring from text`,
  )
  return inferAccountTypeFromText(pdfText, fileName)
}

async function extractDataFromText(
  pdfText: string,
  bankTimezone: string,
  aiModel: string,
  prevMessages: ChatCompletionMessageParam[],
  fileName: string,
): Promise<{
  data: BankStatementData
  llmResponse: ChatCompletionMessage
  filteredTransactions: { count: number; descriptions: string[] }
}> {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: `Please extract all transaction data from these bank statement pages.
The bank is in the ${bankTimezone} timezone, so please interpret all dates as being in that timezone.

EXTRACTED PDF TEXT (use these exact values for all amounts, dates, and numbers):

<bk-extracted-pdf-text>
${pdfText}
</bk-extracted-pdf-text>`,
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

  if (!data.openingBalance && data.openingBalance !== 0) {
    throw new Error('Failed to extract opening balance from statement.')
  }

  if (!data.closingBalance && data.closingBalance !== 0) {
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

  // Validate and normalize accountType — fall back to heuristic if AI got it wrong
  data.accountType = normalizeAccountType(data.accountType, pdfText, fileName)

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
    data.accountType,
    data.accountName,
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
  accountType?: string,
  accountName?: string,
): Promise<string | null> {
  if (!accountNumber) return null

  const bankAccountType = mapToBankAccountType(accountType)
  const nickname = accountName || accountNumber

  const existing = await prisma.bankAccount.findUnique({
    where: {
      userId_accountNumber: { userId, accountNumber },
    },
  })

  if (existing) {
    // Update account type and nickname if they were defaults
    const updates: Record<string, string> = {}
    if (existing.accountType === 'chequing' && bankAccountType !== 'chequing') {
      updates.accountType = bankAccountType
    }
    if (existing.nickname === existing.accountNumber && accountName) {
      updates.nickname = nickname
    }
    if (Object.keys(updates).length > 0) {
      await prisma.bankAccount.update({
        where: { id: existing.id },
        data: updates,
      })
    }
    return existing.id
  }

  const created = await prisma.bankAccount.create({
    data: {
      userId,
      accountNumber,
      nickname,
      bankName,
      currency: 'CAD',
      accountType: bankAccountType,
    },
  })

  return created.id
}

function mapToBankAccountType(accountType?: string): string {
  switch (accountType) {
    case 'credit_card':
      return 'credit_card'
    case 'line_of_credit':
      return 'line_of_credit'
    case 'loan':
    case 'mortgage':
      return 'loan'
    case 'savings':
      return 'savings'
    default:
      return 'chequing'
  }
}

function isLiabilityAccount(accountType?: string): boolean {
  return accountType === 'credit_card'
    || accountType === 'line_of_credit'
    || accountType === 'loan'
    || accountType === 'mortgage'
}

async function saveTransactions(
  transactions: BankStatementData['transactions'],
  userId: string,
  statementId: string,
  accountType?: string,
) {
  if (!transactions || transactions.length === 0) return

  // For liability accounts (credit cards, LOCs, loans), the bank's debit/credit
  // perspective is inverted from the user's perspective:
  //   Bank debit  (charge)  = user spent money  → should be negative (expense)
  //   Bank credit (payment) = user paid debt    → should be positive (income)
  // The AI extracts amounts using the bank's convention (debits negative, credits
  // positive), so for liability accounts we flip the sign and swap the type.
  const flipSign = isLiabilityAccount(accountType)

  const data = transactions.map((tx, index) => {
    const amount = flipSign ? -tx.amount : tx.amount
    const transactionType = flipSign
      ? (tx.type === 'credit' ? 'debit' : 'credit')
      : tx.type

    return {
      userId,
      statementId,
      transactionDate: new Date(tx.date),
      description: tx.description,
      amount,
      balance: tx.balance || null,
      transactionType,
      referenceNumber: tx.referenceNumber || null,
      sortOrder: index,
    }
  })

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

async function syncNetWorthAccount(
  userId: string,
  bankAccountId: string,
  closingBalance: number,
  bankName?: string,
  statementAccountType?: string,
  accountName?: string,
) {
  const { netWorthType, netWorthCategory } = mapToNetWorthType(statementAccountType)
  const displayName = accountName || bankName || 'Bank Account'

  const existing = await prisma.netWorthAccount.findFirst({
    where: { userId, bankAccountId },
  })

  if (existing) {
    const updates: Record<string, unknown> = { currentBalance: closingBalance }
    // Update account type if it was defaulted to asset but should be liability
    if (existing.accountType === 'asset' && netWorthType === 'liability') {
      updates.accountType = netWorthType
      updates.category = netWorthCategory
    }
    // Update name if it was a generic default
    if (accountName && (existing.name === bankName || existing.name === 'Bank Account')) {
      updates.name = displayName
    }
    await prisma.netWorthAccount.update({
      where: { id: existing.id },
      data: updates,
    })
  } else {
    await prisma.netWorthAccount.create({
      data: {
        userId,
        bankAccountId,
        name: displayName,
        accountType: netWorthType,
        category: netWorthCategory,
        currentBalance: closingBalance,
        isManual: false,
      },
    })
  }
}

function mapToNetWorthType(statementAccountType?: string): {
  netWorthType: 'asset' | 'liability'
  netWorthCategory: string
} {
  switch (statementAccountType) {
    case 'credit_card':
      return { netWorthType: 'liability', netWorthCategory: 'credit-card' }
    case 'line_of_credit':
      return { netWorthType: 'liability', netWorthCategory: 'loan' }
    case 'loan':
      return { netWorthType: 'liability', netWorthCategory: 'loan' }
    case 'mortgage':
      return { netWorthType: 'liability', netWorthCategory: 'mortgage' }
    case 'savings':
      return { netWorthType: 'asset', netWorthCategory: 'savings' }
    case 'chequing':
      return { netWorthType: 'asset', netWorthCategory: 'checking' }
    default:
      return { netWorthType: 'asset', netWorthCategory: 'checking' }
  }
}

function getSystemPrompt(timezone: string): string {
  return `You are a financial data extraction expert. Extract all transaction data from the bank statement and return it as structured JSON.

    CRITICAL: When extracted PDF text is provided within <bk-extracted-pdf-text></bk-extracted-pdf-text> tags, you MUST use the exact numeric values from that text for all financial figures (amounts, balances, totals). The extracted text contains the precise values - do NOT estimate, round, or interpret numbers from the images. Your job is to structure the provided text data into JSON format.

    IMPORTANT: The bank operates in the ${timezone} timezone. All dates and times in the statement should be interpreted as being in this timezone.

    CRITICAL — Account type detection (you MUST set accountType correctly):
    The "accountType" field is REQUIRED. Carefully analyze the statement content and set it to one of these values:
      - "credit_card": if the statement mentions ANY of these: Mastercard, Visa, Amex, American Express, credit card, credit limit, minimum payment, payment due date, available credit, cash advance, annual fee, interest charge, purchase interest, balance owing, amount owing, total due, previous statement balance, new balance. Credit card statements show amounts OWED (liabilities), not money held.
      - "line_of_credit": if the statement mentions line of credit, LOC, HELOC, or similar terms
      - "loan": if the statement mentions loan, mortgage, amortization, principal balance, or similar lending terms
      - "savings": if the statement mentions savings account, TFSA, tax-free savings, or high-interest savings
      - "chequing": ONLY for regular chequing/checking accounts with no indicators of the above types
    Do NOT default to "chequing" if there are ANY credit card, loan, or line of credit indicators present.

    Return the data in this exact format:
    {
      "bankName": "string",
      "accountName": "string (full product name, e.g. 'RBC Business Cash Back Mastercard', 'TD Everyday Chequing', 'Scotiabank Value Visa')",
      "accountNumber": "string (full account number as shown on statement)",
      "accountType": "chequing" | "savings" | "credit_card" | "line_of_credit" | "loan" (REQUIRED — see account type detection rules above),
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

    Important extraction rules:
    - The extracted PDF text will be provided within <bk-extracted-pdf-text></bk-extracted-pdf-text> tags
    - Use ONLY the exact values from the extracted PDF text for all numbers (amounts, balances, dates)
    - Do NOT infer, estimate, or OCR numbers from images when text is provided
    - Extract ONLY actual transactions (debits and credits). Do NOT include "Opening balance", "Closing balance", or summary/total lines as transactions
    - Extract ALL transactions visible in the statement
    - Ensure dates are in YYYY-MM-DD format
    - All dates should be interpreted as being in the ${timezone} timezone
    - Amount should be positive for credits/deposits and negative for debits/withdrawals
    - If statementDate is not clearly visible, omit it (periodEnd will be used as fallback)
    - Calculate totals if not explicitly stated
    - Ensure the transactions balance correctly: opening balance + sum of all transaction amounts must equal the closing balance
    - Include the full account number as shown on the statement
    - Set accountName to the full product name as shown on the statement (e.g. "RBC Business Cash Back Mastercard", "TD Everyday Chequing Account"). Include the bank name and the specific product name.`
}
