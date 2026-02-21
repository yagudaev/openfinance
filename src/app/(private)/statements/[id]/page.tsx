import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { StatementDetail } from '@/components/statements/statement-detail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function StatementDetailPage({ params }: Props) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login')

  const { id } = await params

  const statement = await prisma.bankStatement.findFirst({
    where: { id, userId: session.user.id },
    include: {
      transactions: {
        orderBy: { transactionDate: 'asc' },
      },
      balanceVerification: true,
    },
  })

  if (!statement) notFound()

  const serialized = {
    id: statement.id,
    bankName: statement.bankName,
    accountNumber: statement.accountNumber,
    fileName: statement.fileName,
    periodStart: statement.periodStart.toISOString(),
    periodEnd: statement.periodEnd.toISOString(),
    openingBalance: statement.openingBalance,
    closingBalance: statement.closingBalance,
    totalDeposits: statement.totalDeposits,
    totalWithdrawals: statement.totalWithdrawals,
    verificationStatus: statement.verificationStatus,
    discrepancyAmount: statement.discrepancyAmount,
    isProcessed: statement.isProcessed,
    fileUrl: statement.fileUrl,
    transactions: statement.transactions.map(tx => ({
      id: tx.id,
      date: tx.transactionDate.toISOString(),
      description: tx.description,
      amount: tx.amount,
      balance: tx.balance,
      category: tx.category,
      transactionType: tx.transactionType,
    })),
    balanceVerification: statement.balanceVerification
      ? {
          calculatedOpeningBalance: statement.balanceVerification.calculatedOpeningBalance,
          calculatedClosingBalance: statement.balanceVerification.calculatedClosingBalance,
          statementOpeningBalance: statement.balanceVerification.statementOpeningBalance,
          statementClosingBalance: statement.balanceVerification.statementClosingBalance,
          isBalanced: statement.balanceVerification.isBalanced,
          discrepancyAmount: statement.balanceVerification.discrepancyAmount,
          notes: statement.balanceVerification.notes,
        }
      : null,
  }

  return <StatementDetail statement={serialized} />
}
