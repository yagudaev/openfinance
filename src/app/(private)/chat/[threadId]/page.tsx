import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ChatInterface } from '@/components/chat/chat-interface'

interface ChatThreadPageProps {
  params: Promise<{ threadId: string }>
}

export default async function ChatThreadPage({ params }: ChatThreadPageProps) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login')

  const { threadId } = await params

  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, userId: session.user.id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!thread) redirect('/chat')

  const initialMessages = thread.messages.map(m => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: m.content }],
  }))

  const initialTraceIds: Record<string, string> = {}
  for (const m of thread.messages) {
    if (m.traceId) {
      initialTraceIds[m.id] = m.traceId
    }
  }

  // Check if user needs onboarding (no personal context set and no previous messages)
  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  })

  const totalMessages = await prisma.chatMessage.count({
    where: { thread: { userId: session.user.id } },
  })

  const isNewUser = !settings?.aiContext && totalMessages === 0

  return (
    <ChatInterface
      key={thread.id}
      threadId={thread.id}
      initialMessages={initialMessages}
      initialTraceIds={initialTraceIds}
      isNewUser={isNewUser}
    />
  )
}
