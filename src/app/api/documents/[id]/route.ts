import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile, unlink } from 'fs/promises'
import { join } from 'path'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id } = await params

  const document = await prisma.document.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!document) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const filePath = join(process.cwd(), 'data', 'uploads', document.fileUrl)
    const fileBuffer = await readFile(filePath)

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `inline; filename="${document.fileName}"`,
      },
    })
  } catch {
    return new Response('File not found', { status: 404 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const document = await prisma.document.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!document) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const data: Record<string, unknown> = {}

  if (body.documentType !== undefined) data.documentType = body.documentType
  if (body.tags !== undefined) data.tags = body.tags
  if (body.description !== undefined) data.description = body.description

  const updated = await prisma.document.update({
    where: { id },
    data,
  })

  return NextResponse.json({ document: updated })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const document = await prisma.document.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!document) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Delete the file from disk
  try {
    const filePath = join(process.cwd(), 'data', 'uploads', document.fileUrl)
    await unlink(filePath)
  } catch {
    // File may already be deleted — continue with DB cleanup
  }

  await prisma.document.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
