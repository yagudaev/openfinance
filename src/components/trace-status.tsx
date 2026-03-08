const STATUS_MAP: Record<string, { label: string, className: string }> = {
  'stop': { label: 'Completed', className: 'inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700' },
  'tool-calls': { label: 'Tool Calls', className: 'inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700' },
  'length': { label: 'Max Length', className: 'inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700' },
  'content-filter': { label: 'Filtered', className: 'inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700' },
  'error': { label: 'Error', className: 'inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700' },
  'in-progress': { label: 'In Progress', className: 'inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700' },
}

const DEFAULT_STATUS = { className: 'inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700' }

interface TraceStatusProps {
  status: string | null
}

export function TraceStatus({ status }: TraceStatusProps) {
  const match = status ? STATUS_MAP[status] : null
  return (
    <span className={match?.className ?? DEFAULT_STATUS.className}>
      {match?.label ?? status ?? '--'}
    </span>
  )
}
