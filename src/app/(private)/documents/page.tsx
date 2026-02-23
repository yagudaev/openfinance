import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

import type { OwnershipFilter as OwnershipFilterType } from '@/lib/services/dashboard-types'
import { PageFilterBar } from '@/components/layout/page-filter-bar'
import { DocumentFilters } from '@/components/documents/document-filters'
import { DocumentTable } from '@/components/documents/document-table'
import { DocumentUploadZone } from '@/components/documents/document-uploader'
import { TimePeriodSelector } from '@/components/shared/time-period-selector'
import type { DocumentItem, DocumentStatus } from '@/components/documents/document-types'
import {
  getDateRangeBounds,
  type DateRangePreset,
} from '@/lib/types/time-period'

interface DocumentsPageProps {
  searchParams: Promise<{
    search?: string
    category?: string
    ownership?: OwnershipFilterType
    period?: string
    dateFrom?: string
    dateTo?: string
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
  const ownershipFilter: OwnershipFilterType = params.ownership ?? 'combined'
  const period = (params.period as DateRangePreset) || 'all-time'
  const dateFrom = params.dateFrom || ''
  const dateTo = params.dateTo || ''

  // Compute date filter
  const dateRange = getDateRangeBounds(period, dateFrom, dateTo)

  // Query documents — always exclude statement-type docs since those are shown
  // via BankStatement records below (avoids duplicate entries)
  const skipDocuments = category === 'statement'
  const docWhere: Record<string, unknown> = {
    userId: session.user.id,
    documentType: category || { not: 'statement' },
  }
  if (search) {
    docWhere.fileName = { contains: search }
  }
  if (dateRange.from || dateRange.to) {
    const dateFilter: Record<string, Date> = {}
    if (dateRange.from) dateFilter.gte = dateRange.from
    if (dateRange.to) dateFilter.lte = dateRange.to
    docWhere.uploadedAt = dateFilter
  }

  const documents = skipDocuments
    ? []
    : await prisma.document.findMany({
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
    if (ownershipFilter !== 'combined') {
      stmtWhere.bankAccount = { ownershipType: ownershipFilter }
    }
    if (dateRange.from || dateRange.to) {
      const dateFilter: Record<string, Date> = {}
      if (dateRange.from) dateFilter.gte = dateRange.from
      if (dateRange.to) dateFilter.lte = dateRange.to
      stmtWhere.createdAt = dateFilter
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
    <DocumentUploadZone>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-bold text-gray-900">Documents</h1>
        <PageFilterBar ownership={ownershipFilter}>
          <TimePeriodSelector
            value={period}
            customFrom={dateFrom}
            customTo={dateTo}
          />
        </PageFilterBar>
      </div>
      <DocumentFilters search={search} category={category} />
      <DocumentTable documents={documentItems} />
    </DocumentUploadZone>
  )
}
