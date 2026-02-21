import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

function formatLatency(ms: number | null): string {
  if (ms === null) return '--'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatTokens(tokens: number | null): string {
  if (tokens === null) return '--'
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`
  return String(tokens)
}

function truncate(text: string | null, maxLength: number): string {
  if (!text) return '--'
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

function formatTimestamp(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19)
}

function countToolCalls(stepsJson: string): number {
  try {
    const steps = JSON.parse(stepsJson) as Array<{ toolCalls?: unknown[] }>
    return steps.reduce((sum, step) => sum + (step.toolCalls?.length ?? 0), 0)
  } catch {
    return 0
  }
}

export default async function TracesPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login')

  const traces = await prisma.chatTrace.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">AI Traces</h1>
        <p className="mt-1 text-sm text-gray-500">
          Debug AI chat tool calls and responses. Shows full trace for each conversation turn.
        </p>
      </div>

      <div className="mt-6">
        {traces.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm text-gray-500">
              No traces recorded yet. Start a chat conversation to generate traces.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Model
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Prompt
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Tools
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Tokens
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Latency
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {traces.map(trace => {
                  const toolCallCount = countToolCalls(trace.steps)
                  const hasError = !!trace.error
                  return (
                    <tr key={trace.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 font-mono">
                        <Link
                          href={`/admin/traces/${trace.id}`}
                          className="hover:text-violet-600"
                        >
                          {formatTimestamp(trace.createdAt)}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-700 font-mono">
                        {trace.model}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-sm text-gray-700">
                        <Link
                          href={`/admin/traces/${trace.id}`}
                          className="hover:text-violet-600"
                        >
                          {truncate(trace.userMessage, 60)}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500">
                        {toolCallCount > 0 ? (
                          <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {toolCallCount}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">0</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-gray-500 font-mono">
                        {formatTokens(trace.totalTokens)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-gray-500 font-mono">
                        {formatLatency(trace.latencyMs)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        {hasError ? (
                          <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            error
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            {trace.finishReason ?? 'ok'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
