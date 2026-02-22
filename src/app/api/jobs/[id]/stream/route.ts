import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const job = await prisma.job.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!job) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(data: Record<string, unknown>) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        )
      }

      async function poll() {
        try {
          const current = await prisma.job.findFirst({
            where: { id, userId: session!.user.id },
            include: {
              items: {
                orderBy: { createdAt: 'asc' },
                select: {
                  id: true,
                  fileName: true,
                  status: true,
                  error: true,
                },
              },
            },
          })

          if (!current) {
            sendEvent({ type: 'error', message: 'Job not found' })
            controller.close()
            return
          }

          sendEvent({
            type: 'progress',
            job: {
              id: current.id,
              status: current.status,
              progress: current.progress,
              totalItems: current.totalItems,
              completedItems: current.completedItems,
              error: current.error,
              items: current.items,
            },
          })

          if (current.status === 'completed' || current.status === 'failed') {
            sendEvent({ type: 'done', status: current.status })
            controller.close()
            return
          }

          // Poll again in 2 seconds
          setTimeout(poll, 2000)
        } catch {
          try {
            controller.close()
          } catch {
            // Stream may already be closed
          }
        }
      }

      // Start polling
      poll()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
