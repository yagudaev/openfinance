import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { getUploadFullPath } from '@/lib/upload-path'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id } = await params

  const statement = await prisma.bankStatement.findFirst({
    where: { id, userId: session.user.id },
    select: { fileUrl: true, fileName: true },
  })

  if (!statement) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const filePath = getUploadFullPath(statement.fileUrl)
    const fileBuffer = await readFile(filePath)

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${statement.fileName}"`,
      },
    })
  } catch {
    return new Response('File not found', { status: 404 })
  }
}
