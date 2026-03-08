export function formatStatus(finishReason: string | null): { label: string, className: string } {
  switch (finishReason) {
    case 'stop':
      return { label: 'Completed', className: 'inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700' }
    case 'tool-calls':
      return { label: 'Tool Calls', className: 'inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700' }
    case 'length':
      return { label: 'Max Length', className: 'inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700' }
    case 'content-filter':
      return { label: 'Filtered', className: 'inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700' }
    case 'error':
      return { label: 'Error', className: 'inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700' }
    case 'in-progress':
      return { label: 'In Progress', className: 'inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700' }
    default:
      return { label: finishReason ?? '--', className: 'inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700' }
  }
}
