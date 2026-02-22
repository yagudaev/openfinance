import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function ChatPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login')

  let thread = await prisma.chatThread.findFirst({
    where: { userId: session.user.id, isArchived: false },
    orderBy: { updatedAt: 'desc' },
  })

  if (!thread) {
    thread = await prisma.chatThread.create({
      data: { userId: session.user.id },
    })
  }

  redirect(`/chat/${thread.id}`)
}
