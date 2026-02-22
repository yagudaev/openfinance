'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Receipt,
  PieChart,
  FolderOpen,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ListChecks,
  Landmark,
  TrendingUp,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { authClient, useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'

const navItems = [
  { href: '/chat', label: 'Home', icon: MessageSquare },
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/net-worth', label: 'Net Worth', icon: Landmark },
  { href: '/scenarios', label: 'Scenarios', icon: TrendingUp },
  { href: '/transactions', label: 'Transactions', icon: Receipt },
  { href: '/expenses', label: 'Expenses', icon: PieChart },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/jobs', label: 'Jobs', icon: ListChecks },
]

export function Navbar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { data: session } = useSession()

  async function handleSignOut() {
    await authClient.signOut()
    window.location.href = '/auth/login'
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false)
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex items-center">
            <button
              type="button"
              className="sm:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <div className="flex shrink-0 items-center">
              <Link
                href="/chat"
                className="flex items-center gap-2"
              >
                <span className="text-xl font-semibold text-gray-900 font-heading">
                  OpenFinance
                </span>
              </Link>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings" className="rounded-full transition-opacity hover:opacity-80">
              <UserAvatar
                name={session?.user?.name}
                image={session?.user?.image}
              />
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      <div
        className={cn(
          'sm:hidden overflow-hidden transition-all duration-200 ease-in-out',
          mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="border-t border-gray-200 px-4 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
          <div className="border-t border-gray-200 my-1 pt-1">
            <Link
              href="/settings"
              onClick={closeMobileMenu}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname.startsWith('/settings')
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <button
              type="button"
              onClick={() => {
                closeMobileMenu()
                handleSignOut()
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
