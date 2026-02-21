/**
 * Date utilities for timezone-agnostic date handling.
 *
 * Bank statement dates represent calendar dates (e.g., "August 4, 2025") without
 * a specific time. They should be displayed exactly as stored, without timezone
 * conversion.
 */

/**
 * Parses a YYYY-MM-DD date string without timezone conversion.
 * Prevents off-by-one day issues when displaying dates.
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null

  const datePart = dateString.split('T')[0]
  const parts = datePart.split('-')

  if (parts.length !== 3) return null

  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null

  return new Date(year, month, day)
}

/**
 * Formats a date string for display without timezone conversion.
 */
export function formatDate(
  dateString: string | null | undefined,
  formatStr: string,
): string {
  const date = parseDate(dateString)
  if (!date) return ''

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const shortMonths = months.map(m => m.slice(0, 3))

  const replacements: Record<string, string> = {
    'yyyy': String(date.getFullYear()),
    'yy': String(date.getFullYear()).slice(-2),
    'MMMM': months[date.getMonth()],
    'MMM': shortMonths[date.getMonth()],
    'MM': String(date.getMonth() + 1).padStart(2, '0'),
    'dd': String(date.getDate()).padStart(2, '0'),
    'd': String(date.getDate()),
  }

  let result = formatStr
  for (const [token, value] of Object.entries(replacements)) {
    result = result.replace(token, value)
  }

  return result
}

/**
 * Extracts just the date portion (YYYY-MM-DD) from a date string.
 */
export function extractDatePart(dateString: string | null | undefined): string | null {
  if (!dateString) return null
  return dateString.split('T')[0]
}
