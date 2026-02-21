import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { id } = await params

  const trace = await prisma.chatTrace.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!trace) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  }

  return Response.json({
    ...trace,
    steps: JSON.parse(trace.steps),
    createdAt: trace.createdAt.toISOString(),
  })
}
