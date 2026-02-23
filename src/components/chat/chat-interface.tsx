'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, UIMessage } from 'ai'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send,
  Bot,
  Loader2,
  Sparkles,
  Plus,
  Paperclip,
  X,
  FileText,
  Search,
  DollarSign,
  PieChart,
  Settings,
  Calculator,
  TrendingUp,
  Upload,
  Wrench,
  CheckCircle2,
  ChevronRight,
  Brain,
  Trash2,
  BookOpen,
  PanelLeftOpen,
  Bug,
  AlertTriangle,
  XCircle,
  Link,
  Check,
  Square,
  Clock,
  Globe,
  ExternalLink,
  ChevronDown,
} from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { UserAvatar } from '@/components/user-avatar'
import { ThreadSidebar } from '@/components/chat/thread-sidebar'

const TOOL_DISPLAY_INFO: Record<string, { label: string; icon: typeof Wrench }> = {
  search_transactions: { label: 'Looking up transactions', icon: Search },
  get_account_summary: { label: 'Fetching account summary', icon: DollarSign },
  get_cashflow: { label: 'Calculating cashflow', icon: TrendingUp },
  get_category_breakdown: { label: 'Analyzing categories', icon: PieChart },
  get_settings: { label: 'Reading settings', icon: Settings },
  update_settings: { label: 'Updating settings', icon: Settings },
  calculate_tax: { label: 'Calculating tax', icon: Calculator },
  calculate_compound_growth: { label: 'Projecting compound growth', icon: TrendingUp },
  calculate_rrsp: { label: 'Calculating RRSP', icon: Calculator },
  calculate_tfsa: { label: 'Looking up TFSA info', icon: Calculator },
  evaluate_expression: { label: 'Calculating', icon: Calculator },
  save_memory: { label: 'Saving to memory', icon: Brain },
  recall_memory: { label: 'Recalling memories', icon: BookOpen },
  search_memory: { label: 'Searching memories', icon: Search },
  delete_memory: { label: 'Forgetting memory', icon: Trash2 },
  read_file: { label: 'Reading file...', icon: FileText },
  process_statements: { label: 'Processing bank statements...', icon: FileText },
  search_web: { label: 'Searching the web...', icon: Globe },
}

function getToolDisplay(toolName: string | undefined) {
  if (!toolName) return { label: 'Processing', icon: Wrench }
  return TOOL_DISPLAY_INFO[toolName] ?? {
    label: toolName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    icon: Wrench,
  }
}

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Detect markdown table (line with pipes)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const rows = tableLines
        .filter(l => !l.match(/^\|[\s-:|]+\|$/)) // skip separator rows
        .map(l => l.split('|').filter(Boolean).map(c => c.trim()))

      if (rows.length > 0) {
        const headers = rows[0]
        const dataRows = rows.slice(1)
        elements.push(
          <div key={`table-${i}`} className="my-2 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead>
                <tr>
                  {headers.map((h, j) => (
                    <th key={j} className="px-2 py-1 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dataRows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="whitespace-nowrap px-2 py-1 text-gray-700">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        )
      }
      continue
    }

    // Regular line — handle bold (**text**) and headings (### text)
    let content: React.ReactNode = line
    if (line.startsWith('### ')) {
      content = <strong className="text-sm">{line.slice(4)}</strong>
    } else if (line.startsWith('## ')) {
      content = <strong className="text-base">{line.slice(3)}</strong>
    } else {
      // Handle **bold** inline
      const parts = line.split(/(\*\*[^*]+\*\*)/)
      if (parts.length > 1) {
        content = parts.map((p, j) =>
          p.startsWith('**') && p.endsWith('**')
            ? <strong key={j}>{p.slice(2, -2)}</strong>
            : <span key={j}>{p}</span>,
        )
      }
    }

    elements.push(
      <div key={`line-${i}`}>{content || '\u00A0'}</div>,
    )
    i++
  }

  return <>{elements}</>
}

function formatToolData(data: unknown): string {
  if (data === undefined || data === null) return ''
  if (typeof data === 'string') return data
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

function formatToolSummary(toolName: string | undefined, output: unknown): string | null {
  if (!output || typeof output !== 'object') return null
  const data = output as Record<string, unknown>

  if (data.error) return null

  switch (toolName) {
    case 'process_statements': {
      const processed = data.processed as number | undefined
      const totalTransactions = data.totalTransactions as number | undefined
      const failed = data.failed as number | undefined
      const parts: string[] = []
      if (processed !== undefined) {
        parts.push(`Processed ${processed} statement${processed === 1 ? '' : 's'}`)
      }
      if (totalTransactions !== undefined) {
        parts.push(`${totalTransactions} transaction${totalTransactions === 1 ? '' : 's'}`)
      }
      if (failed && failed > 0) {
        parts.push(`${failed} failed`)
      }
      return parts.length > 0 ? parts.join(', ') : null
    }
    case 'search_transactions': {
      const count = data.count as number | undefined
      return count !== undefined ? `Found ${count} transaction${count === 1 ? '' : 's'}` : null
    }
    case 'get_account_summary': {
      const totalAccounts = data.totalAccounts as number | undefined
      return totalAccounts !== undefined ? `${totalAccounts} account${totalAccounts === 1 ? '' : 's'} found` : 'Retrieved account summary'
    }
    case 'get_cashflow':
      return 'Calculated cashflow'
    case 'get_category_breakdown': {
      const totalCategories = data.totalCategories as number | undefined
      return totalCategories !== undefined ? `${totalCategories} categor${totalCategories === 1 ? 'y' : 'ies'} analyzed` : 'Analyzed categories'
    }
    case 'get_settings':
      return 'Retrieved settings'
    case 'update_settings': {
      const updatedFields = data.updatedFields as string[] | undefined
      return updatedFields ? `Updated ${updatedFields.join(', ')}` : 'Settings updated'
    }
    case 'save_memory': {
      const msg = data.message as string | undefined
      return msg || 'Saved to memory'
    }
    case 'recall_memory': {
      const count = data.count as number | undefined
      return count !== undefined ? `${count} memor${count === 1 ? 'y' : 'ies'} found` : null
    }
    case 'search_memory': {
      const count = data.count as number | undefined
      return count !== undefined ? `Found ${count} matching memor${count === 1 ? 'y' : 'ies'}` : null
    }
    case 'delete_memory': {
      const msg = data.message as string | undefined
      return msg || 'Memory deleted'
    }
    case 'calculate_tax':
      return 'Tax calculation complete'
    case 'calculate_compound_growth':
      return 'Growth projection complete'
    case 'calculate_rrsp':
      return 'RRSP calculation complete'
    case 'calculate_tfsa':
      return 'TFSA info retrieved'
    case 'evaluate_expression':
      return 'Calculation complete'
    case 'search_web': {
      const count = data.count as number | undefined
      const query = data.query as string | undefined
      if (count === 0) return `No results for "${query}"`
      return count !== undefined ? `Found ${count} source${count === 1 ? '' : 's'}` : 'Web search complete'
    }
    default:
      return 'Completed'
  }
}

function formatToolResultDetail(toolName: string | undefined, output: unknown): React.ReactNode {
  if (!output || typeof output !== 'object') return null
  const data = output as Record<string, unknown>

  if (data.error) {
    return (
      <div className="flex items-start gap-1.5 text-xs text-red-600">
        <XCircle className="mt-0.5 h-3 w-3 shrink-0" />
        <span>{String(data.error)}</span>
      </div>
    )
  }

  switch (toolName) {
    case 'process_statements': {
      const results = data.results as Array<{
        fileName: string
        success: boolean
        transactionCount?: number
        categorized?: number
        isBalanced?: boolean
        bankName?: string
        periodStart?: string
        periodEnd?: string
        error?: string
      }> | undefined
      if (!results || results.length === 0) return null
      return (
        <div className="space-y-1 text-xs">
          {results.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5">
              {r.success ? (
                <>
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                  <span className="text-gray-700">
                    <span className="font-medium">{r.bankName || r.fileName}</span>
                    {' — '}
                    {r.transactionCount} transaction{r.transactionCount === 1 ? '' : 's'}
                    {r.categorized !== undefined && r.categorized > 0 && ` (${r.categorized} categorized)`}
                    {r.isBalanced !== undefined && (r.isBalanced ? ', balanced' : ', unbalanced')}
                    {r.periodStart && r.periodEnd && (
                      <span className="text-gray-400"> ({r.periodStart} to {r.periodEnd})</span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                  <span className="text-red-600">
                    <span className="font-medium">{r.fileName}</span>
                    {' — '}
                    {r.error || 'Unknown error'}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )
    }
    case 'search_transactions': {
      const count = data.count as number | undefined
      const summary = data.summary as { totalCredits?: string; totalDebits?: string; netAmount?: string } | undefined
      if (count === 0) return <span className="text-xs text-gray-500">No transactions found</span>
      if (!summary) return null
      return (
        <div className="text-xs text-gray-600">
          {summary.totalCredits && <span>Credits: {summary.totalCredits}</span>}
          {summary.totalDebits && <span> | Debits: {summary.totalDebits}</span>}
          {summary.netAmount && <span> | Net: {summary.netAmount}</span>}
        </div>
      )
    }
    case 'search_web': {
      const results = data.results as Array<{
        title: string
        url: string
        publishedDate?: string | null
        excerpt?: string | null
      }> | undefined
      if (!results || results.length === 0) return null
      return <SearchResultsDetail results={results} />
    }
    default:
      return null
  }
}

interface SearchResult {
  title: string
  url: string
  publishedDate?: string | null
  excerpt?: string | null
}

function SearchResultsDetail({ results }: { results: SearchResult[] }) {
  const [expanded, setExpanded] = useState(false)
  const preview = results.slice(0, 2)
  const rest = results.slice(2)

  return (
    <div className="space-y-1.5 text-xs">
      {preview.map((r, i) => (
        <SearchResultItem key={i} result={r} />
      ))}
      {rest.length > 0 && (
        <>
          {expanded && rest.map((r, i) => (
            <SearchResultItem key={i + 2} result={r} />
          ))}
          <button
            type="button"
            onClick={() => setExpanded(prev => !prev)}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? 'Show fewer sources' : `Show ${rest.length} more source${rest.length === 1 ? '' : 's'}`}
          </button>
        </>
      )}
    </div>
  )
}

function SearchResultItem({ result }: { result: SearchResult }) {
  function getDomain(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  }

  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-2 rounded px-1 py-1 transition-colors hover:bg-gray-50"
    >
      <Globe className="mt-0.5 h-3 w-3 shrink-0 text-blue-400" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate font-medium text-gray-700 group-hover:text-blue-600">
            {result.title}
          </span>
          <ExternalLink className="h-2.5 w-2.5 shrink-0 text-gray-300 group-hover:text-blue-400" />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span>{getDomain(result.url)}</span>
          {result.publishedDate && (
            <>
              <span>·</span>
              <span>{result.publishedDate.split('T')[0]}</span>
            </>
          )}
        </div>
      </div>
    </a>
  )
}

interface ToolCallDisplayProps {
  toolName?: string
  state: string
  input?: unknown
  output?: unknown
}

function ToolCallDisplay({ toolName, state, input, output }: ToolCallDisplayProps) {
  const [debugExpanded, setDebugExpanded] = useState(false)
  const { label, icon: Icon } = getToolDisplay(toolName)
  const isDone = state === 'output-available'
  const isError = state === 'output-error'

  const summary = (isDone || isError) ? formatToolSummary(toolName, output) : null
  const resultDetail = (isDone || isError) ? formatToolResultDetail(toolName, output) : null
  const hasDebugData = (input !== undefined && input !== null && Object.keys(input as Record<string, unknown>).length > 0) || output !== undefined

  return (
    <div className="my-1 overflow-hidden rounded-md border border-gray-200 bg-white text-xs">
      {/* Header: tool label + status */}
      <div className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-500">
        <Icon className="h-3.5 w-3.5 shrink-0 text-violet-500" />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">{label}</span>
            {isDone ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
            ) : isError ? (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
            ) : (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gray-400" />
            )}
          </div>
          {summary && (
            <span className="mt-0.5 text-[11px] text-gray-500">{summary}</span>
          )}
        </div>
      </div>

      {/* Friendly result detail (auto-shown when complete, no toggle needed) */}
      {resultDetail && (
        <div className="border-t border-gray-100 px-3 py-2">
          {resultDetail}
        </div>
      )}

      {/* Debug details toggle */}
      {hasDebugData && (isDone || isError) && (
        <div className="border-t border-gray-100">
          <button
            type="button"
            onClick={() => setDebugExpanded(prev => !prev)}
            className="flex w-full items-center gap-1 px-3 py-1.5 text-[11px] text-gray-400 hover:text-gray-500"
          >
            <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${debugExpanded ? 'rotate-90' : ''}`} />
            <span>Debug details</span>
          </button>
          {debugExpanded && (
            <div className="px-3 pb-2 text-[11px]">
              {input !== undefined && input !== null && Object.keys(input as Record<string, unknown>).length > 0 && (
                <div className="mb-1.5">
                  <span className="font-semibold text-gray-500">Args</span>
                  <pre className="mt-0.5 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-gray-50 p-1.5 text-gray-600">
                    {formatToolData(input)}
                  </pre>
                </div>
              )}
              {output !== undefined && (
                <div>
                  <span className="font-semibold text-gray-500">Result</span>
                  <pre className="mt-0.5 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-gray-50 p-1.5 text-gray-600">
                    {formatToolData(output)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const SUGGESTIONS = [
  'What are my top expense categories?',
  'How much did I spend last month?',
  'Show me my recent transactions',
  'What is my account balance?',
]

const ONBOARDING_SUGGESTIONS = [
  'Help me get started with OpenFinance',
  'What can you help me with?',
  'I want to upload my first bank statement',
  'Tell me about your features',
]

interface ChatInterfaceProps {
  threadId: string
  initialMessages?: UIMessage[]
  initialTraceIds?: Record<string, string>
  isNewUser?: boolean
}

export function ChatInterface({ threadId, initialMessages = [], initialTraceIds = {}, isNewUser = false }: ChatInterfaceProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [traceIds] = useState<Record<string, string>>(initialTraceIds)
  const [input, setInput] = useState('')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null)
  const threadIdRef = useRef(threadId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  useEffect(() => {
    threadIdRef.current = threadId
  }, [threadId])

  /* eslint-disable react-hooks/refs -- body is a lazy callback invoked at request time, not during render */
  const transport = useMemo(
    () => new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({ threadId: threadIdRef.current }),
    }),
    [],
  )
  /* eslint-enable react-hooks/refs */

  const { messages, sendMessage, stop, status } = useChat({
    transport,
    messages: initialMessages,
  })
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isLoading = status === 'streaming' || status === 'submitted'

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Auto-focus after loading completes (message sent and response received)
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      inputRef.current?.focus()
    }
  }, [isLoading, messages.length])

  // Auto-send queued message when AI finishes responding
  useEffect(() => {
    if (!isLoading && queuedMessage) {
      sendMessage({ text: queuedMessage })
      setQueuedMessage(null)
    }
  }, [isLoading, queuedMessage, sendMessage])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, queuedMessage])

  async function uploadFile(file: File): Promise<{ filePath: string; fileName: string } | null> {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        console.error('Upload failed:', err.error)
        return null
      }
      return await res.json()
    } catch (err) {
      console.error('Upload error:', err)
      return null
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if ((!input.trim() && !attachedFile) || isUploading) return

    // Don't allow submitting if there's already a queued message
    if (queuedMessage) return

    let messageText = input.trim()

    if (attachedFile) {
      setIsUploading(true)
      const result = await uploadFile(attachedFile)
      setIsUploading(false)

      if (result) {
        const fileRef = `[Attached file: ${result.fileName} (${result.filePath})]`
        messageText = messageText ? `${messageText}\n\n${fileRef}` : fileRef
      } else {
        // Upload failed — don't send the message
        return
      }
    }

    if (!messageText) return

    if (isLoading) {
      // Queue the message to send after current response completes
      setQueuedMessage(messageText)
    } else {
      sendMessage({ text: messageText })
    }
    setInput('')
    setAttachedFile(null)
  }

  function handleStop() {
    stop()
  }

  function handleSuggestion(text: string) {
    sendMessage({ text })
  }

  async function handleNewThread() {
    const res = await fetch('/api/chat/threads', { method: 'POST' })
    const data = await res.json()
    router.push(`/chat/${data.threadId}`)
  }

  function handleSelectThread(selectedThreadId: string) {
    if (selectedThreadId === threadId) return
    router.push(`/chat/${selectedThreadId}`)
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setAttachedFile(file)
    }
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  function handleRemoveFile() {
    setAttachedFile(null)
  }

  function handleAttachClick() {
    fileInputRef.current?.click()
  }

  // Drag & drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      setAttachedFile(file)
    }
  }, [])

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      <ThreadSidebar
        currentThreadId={threadId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectThread={handleSelectThread}
        onNewThread={handleNewThread}
      />

      <div
        className="relative flex min-w-0 flex-1 flex-col"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag & drop overlay */}
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-violet-400 bg-violet-50/80">
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-10 w-10 text-violet-500" />
              <p className="text-sm font-medium text-violet-700">Drop file to attach</p>
            </div>
          </div>
        )}

        {/* Header with sidebar toggle and new conversation button */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
          <button
            type="button"
            onClick={() => setSidebarOpen(prev => !prev)}
            className="inline-flex items-center justify-center rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            title="View conversations"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
              title="Copy link to conversation"
            >
              {linkCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Link className="h-3.5 w-3.5" />
                  Copy link
                </>
              )}
            </button>
            {messages.length > 0 && (
              <button
                onClick={handleNewThread}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                New conversation
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="rounded-full bg-violet-100 p-4">
                <Sparkles className="h-8 w-8 text-violet-600" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-gray-900">
                {isNewUser ? 'Welcome to OpenFinance!' : 'Financial AI Assistant'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {isNewUser
                  ? 'I\'m your personal financial assistant. Let\'s get you set up!'
                  : 'Ask me anything about your finances.'}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                {(isNewUser ? ONBOARDING_SUGGESTIONS : SUGGESTIONS).map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestion(suggestion)}
                    className="rounded-lg border border-gray-200 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100">
                      <Bot className="h-4 w-4 text-violet-600" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-2.5 text-sm ${
                        message.role === 'user'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {message.parts?.map((part, i) => {
                        if (part.type === 'text') {
                          if (message.role === 'assistant') {
                            return <MarkdownContent key={i} text={part.text} />
                          }
                          return (
                            <div key={i} className="whitespace-pre-wrap">
                              {part.text}
                            </div>
                          )
                        }
                        if (part.type?.startsWith('tool-') || part.type === 'dynamic-tool') {
                          const toolPart = part as {
                            type: string
                            toolCallId: string
                            toolName?: string
                            state: string
                            input?: unknown
                            output?: unknown
                          }
                          const toolName = toolPart.toolName ?? toolPart.type.replace(/^tool-/, '')
                          return (
                            <ToolCallDisplay
                              key={i}
                              toolName={toolName}
                              state={toolPart.state}
                              input={toolPart.input}
                              output={toolPart.output}
                            />
                          )
                        }
                        return null
                      })}
                    </div>
                    {message.role === 'assistant' && traceIds[message.id] && (
                      <div className="mt-1">
                        <a
                          href={`https://langfuse.openfinance.to/trace/${traceIds[message.id]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View trace in Langfuse"
                          className="inline-flex items-center text-gray-400 transition-colors hover:text-gray-600"
                        >
                          <Bug className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <UserAvatar
                      name={session?.user?.name}
                      image={session?.user?.image}
                    />
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100">
                    <Bot className="h-4 w-4 text-violet-600" />
                  </div>
                  <div className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              {queuedMessage && (
                <div className="flex justify-end gap-3">
                  <div className="flex flex-col items-end">
                    <div className="max-w-[75%] rounded-lg bg-gray-900/60 px-4 py-2.5 text-sm text-white">
                      <div className="whitespace-pre-wrap">{queuedMessage}</div>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      <span>Queued</span>
                    </div>
                  </div>
                  <UserAvatar
                    name={session?.user?.name}
                    image={session?.user?.image}
                  />
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Sticky bottom input bar */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-white p-4">
          {/* Attached file chip */}
          {attachedFile && (
            <div className="mb-2 flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700">
                <FileText className="h-3.5 w-3.5 text-gray-500" />
                <span className="max-w-48 truncate">{attachedFile.name}</span>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="ml-0.5 rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.md,.csv,.txt,.jpg,.jpeg,.png,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleAttachClick}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2.5 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50"
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={isLoading ? 'Type to queue a follow-up...' : 'Ask about your finances...'}
              disabled={!!queuedMessage}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-violet-300 focus:ring-1 focus:ring-violet-300 disabled:opacity-50"
            />
            {isLoading && !input.trim() && !attachedFile ? (
              <button
                type="button"
                onClick={handleStop}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={isUploading || !!queuedMessage || (!input.trim() && !attachedFile)}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isLoading ? 'Queue' : 'Send'}
              </button>
            )}
          </form>
          {queuedMessage && (
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>Message queued — will send when the current response finishes</span>
              <button
                type="button"
                onClick={() => setQueuedMessage(null)}
                className="ml-auto rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600"
                title="Cancel queued message"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
