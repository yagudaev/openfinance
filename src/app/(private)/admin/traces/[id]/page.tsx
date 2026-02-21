import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

interface StepData {
  stepNumber: number
  text?: string
  toolCalls: Array<{
    toolName: string
    args: Record<string, unknown>
  }>
  toolResults: Array<{
    toolName: string
    args: Record<string, unknown>
    result: unknown
  }>
  finishReason: string
  usage: {
    inputTokens: number | null
    outputTokens: number | null
  }
}

interface Props {
  params: Promise<{ id: string }>
}

function formatLatency(ms: number | null): string {
  if (ms === null) return '--'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export default async function TraceDetailPage({ params }: Props) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login')

  const { id } = await params

  const trace = await prisma.chatTrace.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!trace) notFound()

  let steps: StepData[] = []
  try {
    steps = JSON.parse(trace.steps)
  } catch {
    // steps will remain empty
  }

  const totalToolCalls = steps.reduce((sum, step) => sum + step.toolCalls.length, 0)

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/traces"
          className="text-sm text-violet-600 hover:text-violet-800"
        >
          &larr; Back to traces
        </Link>
      </div>

      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Trace Detail</h1>
        <p className="mt-1 font-mono text-xs text-gray-400">{trace.id}</p>
      </div>

      {/* Overview card */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Overview</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-gray-500">Model</dt>
            <dd className="mt-1 font-mono text-sm text-gray-900">{trace.model}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Latency</dt>
            <dd className="mt-1 font-mono text-sm text-gray-900">{formatLatency(trace.latencyMs)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Finish Reason</dt>
            <dd className="mt-1 font-mono text-sm text-gray-900">{trace.finishReason ?? '--'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Time</dt>
            <dd className="mt-1 font-mono text-sm text-gray-900">
              {trace.createdAt.toISOString().replace('T', ' ').slice(0, 19)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Input Tokens</dt>
            <dd className="mt-1 font-mono text-sm text-gray-900">{trace.inputTokens ?? '--'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Output Tokens</dt>
            <dd className="mt-1 font-mono text-sm text-gray-900">{trace.outputTokens ?? '--'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Total Tokens</dt>
            <dd className="mt-1 font-mono text-sm text-gray-900">{trace.totalTokens ?? '--'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Tool Calls</dt>
            <dd className="mt-1 font-mono text-sm text-gray-900">{totalToolCalls}</dd>
          </div>
          {trace.threadId && (
            <div>
              <dt className="text-xs text-gray-500">Thread ID</dt>
              <dd className="mt-1 font-mono text-xs text-gray-900 break-all">{trace.threadId}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* User message */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">User Message</h2>
        <div className="mt-3 whitespace-pre-wrap text-sm text-gray-800">
          {trace.userMessage || <span className="italic text-gray-400">No user message recorded</span>}
        </div>
      </div>

      {/* Steps */}
      <div className="mt-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Steps ({steps.length})
        </h2>
        {steps.map((step, index) => (
          <div key={index} className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Step {step.stepNumber + 1}
              </h3>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="font-mono">
                  {step.usage.inputTokens ?? 0}in / {step.usage.outputTokens ?? 0}out
                </span>
                <span className={
                  step.finishReason === 'stop'
                    ? 'inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700'
                    : step.finishReason === 'tool-calls'
                      ? 'inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700'
                      : 'inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700'
                }>
                  {step.finishReason}
                </span>
              </div>
            </div>

            {/* Tool calls in this step */}
            {step.toolCalls.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tool Calls ({step.toolCalls.length})
                </h4>
                <div className="mt-2 space-y-3">
                  {step.toolCalls.map((tc, tcIndex) => (
                    <div key={tcIndex} className="rounded border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex rounded bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">
                          {tc.toolName}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">Arguments:</span>
                        <pre className="mt-1 overflow-x-auto rounded bg-gray-900 p-3 text-xs text-green-400">
                          {formatJson(tc.args)}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tool results in this step */}
            {step.toolResults.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tool Results ({step.toolResults.length})
                </h4>
                <div className="mt-2 space-y-3">
                  {step.toolResults.map((tr, trIndex) => (
                    <div key={trIndex} className="rounded border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          {tr.toolName}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">Result:</span>
                        <pre className="mt-1 max-h-80 overflow-auto rounded bg-gray-900 p-3 text-xs text-green-400">
                          {formatJson(tr.result)}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Text output in this step */}
            {step.text && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Text Output
                </h4>
                <div className="mt-2 whitespace-pre-wrap rounded border border-gray-100 bg-gray-50 p-3 text-sm text-gray-800">
                  {step.text}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Final assistant output */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Final Output</h2>
        <div className="mt-3 whitespace-pre-wrap text-sm text-gray-800">
          {trace.assistantText || <span className="italic text-gray-400">No text output</span>}
        </div>
      </div>

      {/* Error (if any) */}
      {trace.error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-red-600">Error</h2>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm text-red-800">
            {trace.error}
          </pre>
        </div>
      )}
    </div>
  )
}
