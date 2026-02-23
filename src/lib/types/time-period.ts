import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subYears,
  subDays,
} from 'date-fns'

export type DateRangePreset =
  | 'today'
  | 'last-7-days'
  | 'last-30-days'
  | 'this-month'
  | 'last-month'
  | 'this-quarter'
  | 'this-year'
  | 'last-year'
  | 'last-3-months'
  | 'all-time'
  | 'custom'

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'last-7-days', label: 'Last 7 days' },
  { value: 'last-30-days', label: 'Last 30 days' },
  { value: 'last-3-months', label: 'Last 3 months' },
  { value: 'all-time', label: 'All time' },
]

export interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

export function getDateRangeBounds(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string,
): DateRange {
  const now = new Date()

  switch (preset) {
    case 'today':
      return {
        from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
      }
    case 'last-7-days':
      return { from: subDays(now, 7), to: now }
    case 'last-30-days':
      return { from: subDays(now, 30), to: now }
    case 'this-month':
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'last-month': {
      const lastMonth = subMonths(now, 1)
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
    }
    case 'this-quarter':
      return { from: startOfQuarter(now), to: endOfQuarter(now) }
    case 'this-year':
      return { from: startOfYear(now), to: endOfYear(now) }
    case 'last-year': {
      const lastYear = subYears(now, 1)
      return { from: startOfYear(lastYear), to: endOfYear(lastYear) }
    }
    case 'last-3-months':
      return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) }
    case 'all-time':
      return { from: undefined, to: undefined }
    case 'custom': {
      return {
        from: customFrom ? new Date(customFrom + 'T00:00:00') : undefined,
        to: customTo ? new Date(customTo + 'T23:59:59') : undefined,
      }
    }
    default:
      return { from: undefined, to: undefined }
  }
}
