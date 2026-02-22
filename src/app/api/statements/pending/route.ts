import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const statements = await prisma.bankStatement.findMany({
      where: {
        userId: session.user.id,
        status: 'pending',
      },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return Response.json({ statements, count: statements.length })
  } catch (error) {
    console.error('Error fetching pending statements:', error)
    return Response.json({ statements: [], count: 0 })
  }
}
