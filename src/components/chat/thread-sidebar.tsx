'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, MessageSquare, X, MoreHorizontal, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-is-mobile'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

interface ThreadItem {
  id: string
  title: string
  updatedAt: string
  isArchived: boolean
  messageCount: number
}

interface ThreadSidebarProps {
  currentThreadId: string
  isOpen: boolean
  onClose: () => void
  onSelectThread: (threadId: string) => void
  onNewThread: () => void
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

async function renameThread(threadId: string, title: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/chat/threads/${threadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    return res.ok
  } catch {
    return false
  }
}

function EditableInput({
  defaultValue,
  onSave,
  onCancel,
}: {
  defaultValue: string
  onSave: (newTitle: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      node.focus()
      node.select()
    }
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = value.trim()
      if (trimmed && trimmed !== defaultValue) {
        onSave(trimmed)
      } else {
        onCancel()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  function handleBlur() {
    const trimmed = value.trim()
    if (trimmed && trimmed !== defaultValue) {
      onSave(trimmed)
    } else {
      onCancel()
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onClick={e => e.stopPropagation()}
      className="w-full rounded border border-violet-300 bg-white px-1 py-0.5 text-sm font-medium outline-none ring-1 ring-violet-300"
    />
  )
}

function ThreadList({
  threads,
  currentThreadId,
  onSelectThread,
  onRenameThread,
}: {
  threads: ThreadItem[]
  currentThreadId: string
  onSelectThread: (threadId: string) => void
  onRenameThread: (threadId: string, newTitle: string) => void
}) {
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null)

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <MessageSquare className="h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">No conversations yet</p>
      </div>
    )
  }

  function handleStartEditing(threadId: string) {
    setEditingThreadId(threadId)
  }

  function handleSave(threadId: string, newTitle: string) {
    onRenameThread(threadId, newTitle)
    setEditingThreadId(null)
  }

  function handleCancel() {
    setEditingThreadId(null)
  }

  return (
    <div className="space-y-0.5">
      {threads.map(thread => {
        const isEditing = editingThreadId === thread.id

        return (
          <div
            key={thread.id}
            className={cn(
              'group relative flex w-full items-start rounded-md px-3 py-2.5 text-left transition-colors',
              thread.id === currentThreadId
                ? 'bg-violet-50 text-violet-900'
                : 'text-gray-700 hover:bg-gray-50',
            )}
          >
            <button
              type="button"
              onClick={() => {
                if (!isEditing) onSelectThread(thread.id)
              }}
              className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
            >
              {isEditing ? (
                <EditableInput
                  defaultValue={thread.title}
                  onSave={newTitle => handleSave(thread.id, newTitle)}
                  onCancel={handleCancel}
                />
              ) : (
                <span
                  className="line-clamp-1 text-sm font-medium"
                  onDoubleClick={e => {
                    e.stopPropagation()
                    handleStartEditing(thread.id)
                  }}
                >
                  {thread.title}
                </span>
              )}
              <span className="text-xs text-gray-400">
                {formatRelativeDate(thread.updatedAt)}
                {thread.messageCount > 0 && (
                  <> &middot; {thread.messageCount} message{thread.messageCount !== 1 ? 's' : ''}</>
                )}
              </span>
            </button>

            {!isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={e => e.stopPropagation()}
                    className={cn(
                      'ml-1 shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600',
                      'opacity-0 group-hover:opacity-100 focus:opacity-100',
                    )}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem
                    onClick={e => {
                      e.stopPropagation()
                      handleStartEditing(thread.id)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Rename
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function ThreadSidebar({
  currentThreadId,
  isOpen,
  onClose,
  onSelectThread,
  onNewThread,
}: ThreadSidebarProps) {
  const isMobile = useIsMobile()
  const [threads, setThreads] = useState<ThreadItem[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchThreads = useCallback(async (query = '') => {
    setIsLoading(true)
    try {
      const params = query ? `?search=${encodeURIComponent(query)}` : ''
      const res = await fetch(`/api/chat/threads${params}`)
      if (res.ok) {
        const data = await res.json()
        setThreads(data.threads)
      }
    } catch (error) {
      console.error('Failed to fetch threads:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchThreads()
    }
  }, [isOpen, fetchThreads])

  useEffect(() => {
    if (!isOpen) return

    const timer = setTimeout(() => {
      fetchThreads(search)
    }, 300)

    return () => clearTimeout(timer)
  }, [search, isOpen, fetchThreads])

  function handleSelectThread(threadId: string) {
    onSelectThread(threadId)
    onClose()
  }

  function handleNewThread() {
    onNewThread()
    onClose()
  }

  async function handleRenameThread(threadId: string, newTitle: string) {
    // Optimistic update
    setThreads(prev =>
      prev.map(t => (t.id === threadId ? { ...t, title: newTitle } : t)),
    )

    const success = await renameThread(threadId, newTitle)
    if (!success) {
      // Revert on failure by refetching
      fetchThreads(search)
    }
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Conversations</h2>
        <button
          type="button"
          onClick={handleNewThread}
          className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </div>

      <div className="border-b border-gray-200 px-4 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-8 text-xs outline-none placeholder:text-gray-400 focus:border-violet-300 focus:bg-white focus:ring-1 focus:ring-violet-300"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {isLoading && threads.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-violet-600" />
          </div>
        ) : (
          <ThreadList
            threads={threads}
            currentThreadId={currentThreadId}
            onSelectThread={handleSelectThread}
            onRenameThread={handleRenameThread}
          />
        )}
      </div>
    </div>
  )

  // Mobile: sheet overlay, Desktop: inline collapsible sidebar
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={open => { if (!open) onClose() }}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Conversations</SheetTitle>
          </SheetHeader>
          {sidebarContent}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      className={cn(
        'shrink-0 border-r border-gray-200 bg-white transition-all duration-200',
        isOpen ? 'w-72' : 'w-0 overflow-hidden',
      )}
    >
      {sidebarContent}
    </div>
  )
}
