'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/statements', label: 'Statements', icon: FileText },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Navbar() {
  const pathname = usePathname()

  async function handleSignOut() {
    await authClient.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 md:px-6">
        <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
          <span className="font-heading text-lg font-bold">OpenFinance</span>
        </Link>

        <nav className="flex items-center space-x-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
