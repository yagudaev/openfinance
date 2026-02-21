'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, UIMessage } from 'ai'
import { useState, useRef, useEffect, useMemo } from 'react'
import { Send, Bot, Loader2, Sparkles, Plus } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { UserAvatar } from '@/components/user-avatar'

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

const SUGGESTIONS = [
  'What are my top expense categories?',
  'How much did I spend last month?',
  'Show me my recent transactions',
  'What is my account balance?',
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
  const threadIdRef = useRef(threadId)

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
  const [hasTriggeredOnboarding, setHasTriggeredOnboarding] = useState(false)

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isNewUser && !hasTriggeredOnboarding && messages.length === 0) {
      setHasTriggeredOnboarding(true)
      sendMessage({ text: 'Hi! I just signed up. Help me get started with OpenFinance.' })
    }
  }, [isNewUser, hasTriggeredOnboarding, messages.length, sendMessage])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  function handleSuggestion(text: string) {
    sendMessage({ text })
  }

  async function handleNewThread() {
    const res = await fetch('/api/chat/threads', { method: 'POST' })
    const data = await res.json()
    setThreadId(data.threadId)
    setMessages([])
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
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
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="rounded-full bg-violet-100 p-4">
              <Sparkles className="h-8 w-8 text-violet-600" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              Financial AI Assistant
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Ask me anything about your finances.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              {SUGGESTIONS.map(suggestion => (
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
                        <div key={i} className="my-1 rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
                          <span className="font-medium">Tool:</span> {toolPart.toolName || toolPart.toolCallId}
                          {toolPart.state === 'output-available' && (
                            <span className="ml-2 text-green-600">Done</span>
                          )}
                        </div>
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

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
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
            disabled={isLoading || !input.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {isLoading ? (
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
