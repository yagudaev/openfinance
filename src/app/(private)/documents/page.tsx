import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DocumentFilters } from '@/components/documents/document-filters'
import { DocumentTable } from '@/components/documents/document-table'
import { DocumentUploader } from '@/components/documents/document-uploader'
import type { DocumentItem, DocumentStatus } from '@/components/documents/document-types'

interface DocumentsPageProps {
  searchParams: Promise<{
    search?: string
    category?: string
  }>
}

function getStatementStatus(statement: {
  isProcessed: boolean
  verificationStatus: string | null
}): DocumentStatus {
  if (!statement.isProcessed) return 'pending'
  if (statement.verificationStatus === 'error') return 'error'
  return 'done'
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login')

  const params = await searchParams
  const search = params.search || ''
  const category = params.category || ''

  // Query documents
  const docWhere: Record<string, unknown> = { userId: session.user.id }
  if (search) {
    docWhere.fileName = { contains: search }
  }
  if (category) {
    docWhere.documentType = category
  }

  const documents = await prisma.document.findMany({
    where: docWhere,
    orderBy: { uploadedAt: 'desc' },
  })

  // Query statements (show when no category filter, or when category is 'statement')
  const showStatements = !category || category === 'statement'

  const statementItems: DocumentItem[] = []

  if (showStatements) {
    const stmtWhere: Record<string, unknown> = { userId: session.user.id }
    if (search) {
      stmtWhere.OR = [
        { fileName: { contains: search } },
        { bankName: { contains: search } },
      ]
    }

    const statements = await prisma.bankStatement.findMany({
      where: stmtWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        bankAccount: { select: { nickname: true } },
      },
    })

    for (const stmt of statements) {
      statementItems.push({
        id: `stmt-${stmt.id}`,
        fileName: stmt.fileName,
        fileSize: stmt.fileSize,
        mimeType: 'application/pdf',
        documentType: 'statement',
        tags: null,
        description: `${stmt.bankName} \u2014 ${stmt.accountNumber || 'No account'}`,
        uploadedAt: stmt.createdAt.toISOString(),
        status: getStatementStatus(stmt),
        accountName: stmt.bankAccount?.nickname || stmt.bankName,
        source: 'statement' as const,
        statementId: stmt.id,
      })
    }
  }

  // Merge into unified list
  const documentItems: DocumentItem[] = [
    ...documents.map(doc => ({
      id: doc.id,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      documentType: doc.documentType,
      tags: doc.tags,
      description: doc.description,
      uploadedAt: doc.uploadedAt.toISOString(),
      status: 'done' as DocumentStatus,
      accountName: null,
      source: 'document' as const,
      statementId: null,
    })),
    ...statementItems,
  ]

  // Sort by upload date descending
  documentItems.sort((a, b) =>
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  )

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Documents</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload and manage your financial documents.
        </p>
      </div>

      <DocumentUploader />

      <DocumentFilters search={search} category={category} />

      <DocumentTable documents={documentItems} />
    </div>
  )
}
