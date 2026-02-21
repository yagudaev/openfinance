'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, UIMessage } from 'ai'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
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
} from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { UserAvatar } from '@/components/user-avatar'

const TOOL_DISPLAY_INFO: Record<string, { label: string; icon: typeof Wrench }> = {
  search_transactions: { label: 'Search Transactions', icon: Search },
  get_account_summary: { label: 'Account Summary', icon: DollarSign },
  get_cashflow: { label: 'Cashflow', icon: TrendingUp },
  get_category_breakdown: { label: 'Category Breakdown', icon: PieChart },
  get_settings: { label: 'Settings', icon: Settings },
  update_settings: { label: 'Update Settings', icon: Settings },
  calculate_tax: { label: 'Calculate Tax', icon: Calculator },
  calculate_compound_growth: { label: 'Compound Growth', icon: TrendingUp },
  calculate_rrsp: { label: 'RRSP Calculator', icon: Calculator },
  calculate_tfsa: { label: 'TFSA Info', icon: Calculator },
  evaluate_expression: { label: 'Calculate', icon: Calculator },
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

function ToolCallDisplay({ toolName, state }: { toolName?: string; state: string }) {
  const { label, icon: Icon } = getToolDisplay(toolName)
  const isDone = state === 'output-available'

  return (
    <div className="my-1 flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
      <Icon className="h-3.5 w-3.5 shrink-0 text-violet-500" />
      <span className="font-medium text-gray-700">{label}</span>
      {isDone ? (
        <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-green-500" />
      ) : (
        <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-gray-400" />
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
  isNewUser?: boolean
}

export function ChatInterface({ threadId: initialThreadId, initialMessages = [], isNewUser = false }: ChatInterfaceProps) {
  const { data: session } = useSession()
  const [threadId, setThreadId] = useState(initialThreadId)
  const [input, setInput] = useState('')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
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

  const { messages, sendMessage, status, setMessages } = useChat({
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    if ((!input.trim() && !attachedFile) || isLoading || isUploading) return

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

    sendMessage({ text: messageText })
    setInput('')
    setAttachedFile(null)
  }

  function handleSuggestion(text: string) {
    sendMessage({ text })
  }

  async function handleNewThread() {
    const res = await fetch('/api/chat/threads', { method: 'POST' })
    const data = await res.json()
    setThreadId(data.threadId)
    setMessages([])
    setAttachedFile(null)
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
    <div
      className="relative flex h-[calc(100vh-8rem)] flex-col"
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

      {/* Header with new conversation button */}
      {messages.length > 0 && (
        <div className="flex items-center justify-end border-b border-gray-200 px-4 py-2">
          <button
            onClick={handleNewThread}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            New conversation
          </button>
        </div>
      )}

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
                    if (part.type?.startsWith('tool-')) {
                      const toolPart = part as { type: string; toolCallId: string; toolName?: string; state: string }
                      return (
                        <ToolCallDisplay
                          key={i}
                          toolName={toolPart.toolName}
                          state={toolPart.state}
                        />
                      )
                    }
                    return null
                  })}
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
            accept=".pdf"
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
            placeholder="Ask about your finances..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-violet-300 focus:ring-1 focus:ring-violet-300 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || isUploading || (!input.trim() && !attachedFile)}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {isLoading || isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
