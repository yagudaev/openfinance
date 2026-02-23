import { CATEGORIES } from '@/lib/constants/categories'
import { openai } from '@/lib/openai'
import { prisma } from '@/lib/prisma'
import { getActiveCategories } from '@/lib/services/expense-categories'

interface CategorizationResult {
  transactionId: string
  category: string
  confidence: number
}

export async function categorizeTransactions(
  transactionIds: string[],
  userId: string,
): Promise<{ success: boolean; categorized: number; error?: string }> {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId,
      },
      include: {
        statement: {
          select: { accountNumber: true },
        },
      },
    })

    if (!transactions.length) {
      throw new Error('No transactions found')
    }

    const bankAccounts = await prisma.bankAccount.findMany({
      where: { userId },
      select: { accountNumber: true, nickname: true },
    })

    const nicknameMap = Object.fromEntries(
      bankAccounts.map(a => [a.accountNumber, a.nickname]),
    )

    const toProcess = transactions.map(t => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      transaction_type: t.transactionType,
      transaction_date: t.transactionDate.toISOString().split('T')[0],
      account_number: t.statement?.accountNumber ?? null,
      account_nickname: t.statement?.accountNumber
        ? nicknameMap[t.statement.accountNumber]
        : undefined,
    }))

    const categorizations = await categorizeBatch(toProcess, userId)

    let categorizedCount = 0
    for (const result of categorizations) {
      await prisma.transaction.update({
        where: { id: result.transactionId, userId },
        data: { category: result.category },
      })
      categorizedCount++
    }

    return { success: true, categorized: categorizedCount }
  } catch (error) {
    console.error('Error categorizing transactions:', error)
    return {
      success: false,
      categorized: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function buildCategoryPrompt(userId: string): Promise<{ descriptions: string; names: string[] }> {
  // Try user's custom categories first
  const userCategories = await getActiveCategories(userId)

  if (userCategories.length > 0) {
    const descriptions = userCategories
      .map(c => `- "${c.name}": ${c.description || c.name}`)
      .join('\n')
    const names = userCategories.map(c => c.name)
    return { descriptions, names }
  }

  // Fall back to legacy hardcoded categories
  const descriptions = CATEGORIES.map(
    c => `- "${c.value}": ${c.label}`,
  ).join('\n')
  const names = CATEGORIES.map(c => c.value)
  return { descriptions, names }
}

async function categorizeBatch(
  transactions: Array<{
    id: string
    description: string
    amount: number
    transaction_type: string
    transaction_date: string
    account_number?: string | null
    account_nickname?: string
  }>,
  userId: string,
): Promise<CategorizationResult[]> {
  const { descriptions, names } = await buildCategoryPrompt(userId)
  const categoryEnum = names.map(n => `"${n}"`).join(' | ')

  const systemMessage = `You are a financial transaction categorization assistant. Categorize each transaction into one of these categories:

${descriptions}

Rules:
- Pick the single best category for each transaction based on the merchant/description and amount.
- Use the category names EXACTLY as listed above.
- Categorize based on WHAT was purchased, not what type of account it came from. The account name (e.g. "Business Cash Back Mastercard") describes the account, NOT the expense category. A coffee bought on a business credit card is still "Dining", not "Business".
- Prefer specific categories over generic ones. For example: software subscriptions (GitHub, OpenAI, Notion, Vercel, Azure, Google Workspace) should be "Subscriptions" not "Business". Marketing tools (Mailchimp, EmailOctopus, advertising) and social media platforms (X Corp, Meta) used for promotion should be "Business" only if no better match exists.
- Interest charges and finance charges should be categorized as "Other" unless a more specific fees category exists.
- Payments to the credit card itself (e.g. "Payment Thank You", "Payment Received") are "Transfer" — they are internal transfers between accounts, not expenses.

Respond with JSON:
{
  "categorizations": [
    {
      "transactionId": "uuid",
      "category": ${categoryEnum},
      "confidence": 0.0-1.0
    }
  ]
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: `Categorize these transactions:\n\n${JSON.stringify(transactions, null, 2)}` },
      ],
      response_format: { type: 'json_object' },
    })

    const response = completion.choices[0]?.message?.content
    if (!response) throw new Error('No response from LLM')

    const parsed = JSON.parse(response)
    return Array.isArray(parsed) ? parsed : parsed.categorizations || []
  } catch (error) {
    console.error('Error in LLM categorization:', error)
    return transactions.map(t => ({
      transactionId: t.id,
      category: names[0] || 'expense',
      confidence: 0.1,
    }))
  }
}
