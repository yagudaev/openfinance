import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ChatInterface } from '@/components/chat/chat-interface'

export default async function ChatPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login')

  let thread = await prisma.chatThread.findFirst({
    where: { userId: session.user.id, isArchived: false },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!thread) {
    thread = await prisma.chatThread.create({
      data: { userId: session.user.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })
  }

  const initialMessages = thread.messages.map(m => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: m.content }],
  }))

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
      threadId={thread.id}
      initialMessages={initialMessages}
      isNewUser={isNewUser}
    />
  )
}
