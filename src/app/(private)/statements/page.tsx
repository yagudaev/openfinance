import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { UploadButton } from '@/components/statements/upload-button'
import { formatDate } from '@/lib/utils/date'
import Link from 'next/link'

export default async function StatementsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login')

  const statements = await prisma.bankStatement.findMany({
    where: { userId: session.user.id },
    orderBy: { periodEnd: 'desc' },
    include: {
      _count: { select: { transactions: true } },
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Statements</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload and manage your bank statements.
          </p>
        </div>
        <UploadButton />
      </div>

      <div className="mt-6">
        {statements.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm text-gray-500">
              No statements uploaded yet. Upload a bank statement PDF to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Bank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Account
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Transactions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {statements.map(statement => (
                  <tr key={statement.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      <Link
                        href={`/statements/${statement.id}`}
                        className="hover:text-violet-600"
                      >
                        {statement.bankName}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(statement.periodStart.toISOString(), 'MMM dd, yyyy')}
                      {' — '}
                      {formatDate(statement.periodEnd.toISOString(), 'MMM dd, yyyy')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {statement.accountNumber || '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                      {statement._count.transactions}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <span className={
                        statement.verificationStatus === 'verified'
                          ? 'inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700'
                          : statement.verificationStatus === 'unbalanced'
                            ? 'inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700'
                            : 'inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700'
                      }>
                        {statement.verificationStatus || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
