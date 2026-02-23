import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { Navbar } from '@/components/layout/navbar'
import { Toaster } from '@/components/ui/sonner'
import { FloatingJobIndicator } from '@/components/jobs/floating-job-indicator'

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    return redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={session.user.name} userImage={session.user.image} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <FloatingJobIndicator />
      <Toaster richColors position="bottom-right" />
    </div>
  )
}
