import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

import { DocumentFilters } from '@/components/documents/document-filters'
import { DocumentTable } from '@/components/documents/document-table'
import { DocumentUploader } from '@/components/documents/document-uploader'

interface DocumentsPageProps {
  searchParams: Promise<{
    search?: string
    type?: string
  }>
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login')

  const params = await searchParams
  const search = params.search || ''
  const documentType = params.type || ''

  const where: Record<string, unknown> = { userId: session.user.id }

  if (search) {
    where.fileName = { contains: search }
  }

  if (documentType) {
    where.documentType = documentType
  }

  const documents = await prisma.document.findMany({
    where,
    orderBy: { uploadedAt: 'desc' },
  })

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Documents</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload and manage your financial documents.
          </p>
        </div>
      </div>

      <DocumentUploader />

      <DocumentFilters search={search} documentType={documentType} />

      <DocumentTable
        documents={documents.map(doc => ({
          id: doc.id,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          documentType: doc.documentType,
          tags: doc.tags,
          description: doc.description,
          uploadedAt: doc.uploadedAt.toISOString(),
        }))}
      />
    </div>
  )
}
