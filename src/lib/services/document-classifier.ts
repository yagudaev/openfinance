import type { DocumentCategory } from '@/components/documents/document-types'

/**
 * Filename patterns that indicate a bank/financial statement.
 *
 * Matches common bank naming conventions:
 * - Contains "statement" (case-insensitive)
 * - Contains "bank" + date patterns (e.g. "bank_2024-01.pdf")
 * - Common patterns like "acct", "account" with date/number sequences
 */
const STATEMENT_PATTERNS: RegExp[] = [
  /statement/i,
  /\bbank\b.*\d{4}/i,
  /\baccount\b.*\d{4}/i,
  /\bacct\b.*\d{4}/i,
  /\bchequ(e|ing)\b/i,
  /\bsavings?\b/i,
  /\bcredit.?card\b/i,
  /\bvisa\b.*\d{4}/i,
  /\bmastercard\b/i,
]

const TAX_PATTERNS: RegExp[] = [
  /\btax\b/i,
  /\bw-?2\b/i,
  /\b1099\b/i,
  /\b1098\b/i,
  /\bw-?9\b/i,
  /\bt4\b/i,
  /\bt5\b/i,
]

const RECEIPT_PATTERNS: RegExp[] = [
  /\breceipt\b/i,
  /\binvoice\b/i,
]

const INVESTMENT_PATTERNS: RegExp[] = [
  /\binvestment\b/i,
  /\bportfolio\b/i,
  /\bbrokerage\b/i,
  /\bdividend\b/i,
  /\bcapital.?gain/i,
]

const SPREADSHEET_EXTENSIONS = new Set(['xlsx', 'xls', 'csv'])

/**
 * Classify a document by its filename before any content analysis.
 *
 * Returns a DocumentCategory if the filename matches a known pattern,
 * or null to fall through to content-based classification.
 */
export function classifyByFilename(filename: string): DocumentCategory | null {
  const extension = filename.split('.').pop()?.toLowerCase()

  // Spreadsheets are identifiable purely by extension
  if (extension && SPREADSHEET_EXTENSIONS.has(extension)) {
    return 'spreadsheet'
  }

  // Strip extension for pattern matching against the name portion
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '')

  for (const pattern of STATEMENT_PATTERNS) {
    if (pattern.test(nameWithoutExt)) {
      return 'statement'
    }
  }

  for (const pattern of TAX_PATTERNS) {
    if (pattern.test(nameWithoutExt)) {
      return 'tax'
    }
  }

  for (const pattern of RECEIPT_PATTERNS) {
    if (pattern.test(nameWithoutExt)) {
      return 'receipt'
    }
  }

  for (const pattern of INVESTMENT_PATTERNS) {
    if (pattern.test(nameWithoutExt)) {
      return 'investment'
    }
  }

  return null
}
