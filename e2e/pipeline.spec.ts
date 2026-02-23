import { test, expect } from '@playwright/test'
import { ensureLoggedIn } from './helpers'
import { join } from 'path'
import { mkdirSync, existsSync, readdirSync } from 'fs'

/**
 * Pipeline integration tests: upload → classify → process → transactions.
 *
 * These tests verify the full end-to-end flow of uploading a bank statement
 * PDF and verifying that transactions are extracted and categorized.
 *
 * Requires a real bank statement PDF to run. All tests skip gracefully
 * when no PDF is available (e.g. in CI).
 */

const TEST_FIXTURES_DIR = join(__dirname, 'fixtures')

function ensureTestFixtures() {
  if (!existsSync(TEST_FIXTURES_DIR)) {
    mkdirSync(TEST_FIXTURES_DIR, { recursive: true })
  }
}

test.describe('Statement Upload Pipeline', () => {
  // Tests depend on the upload test running first — run in serial
  // so if the upload test skips, dependent tests also skip.
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    ensureTestFixtures()

    // Skip ALL pipeline tests when no test PDF is available (e.g. CI)
    const testPdf = getTestStatementPath()
    if (!testPdf) {
      test.skip(true, 'No test PDF available — skipping pipeline test')
      return
    }

    await ensureLoggedIn(page)
  })

  test('uploading a statement via Statements page creates transactions', async ({ page }) => {
    // Navigate to Statements page
    await page.goto('/statements')
    await expect(page.getByRole('heading', { name: 'Statements' })).toBeVisible()

    // Get initial statement count
    const initialRows = await page.locator('tbody tr').count()

    // Upload a test PDF via the file input
    const testPdf = getTestStatementPath()!

    // Use the Uppy uploader — find the file input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testPdf)

    // Wait for upload to complete and processing to start
    // The statement uploader shows a "Processing statements with AI..." message
    await expect(page.getByText(/Processing statement/i)).toBeVisible({ timeout: 10_000 })

    // Wait for processing to complete (up to 2 minutes for AI)
    await expect(page.getByText(/transactions extracted/i)).toBeVisible({ timeout: 120_000 })

    // Refresh and check that a new statement row appeared
    await page.goto('/statements')
    const newRows = await page.locator('tbody tr').count()
    expect(newRows).toBeGreaterThan(initialRows)

    // Verify the statement shows a non-zero transaction count
    const lastRow = page.locator('tbody tr').first()
    const txCountCell = lastRow.locator('td').nth(3) // Transactions column
    const txCount = await txCountCell.textContent()
    expect(parseInt(txCount || '0', 10)).toBeGreaterThan(0)
  })

  test('documents page shows uploaded statements', async ({ page }) => {
    await page.goto('/documents')
    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible()

    // Check that there are documents in the table
    const rows = await page.locator('tbody tr').count()
    expect(rows).toBeGreaterThan(0)

    // Check that at least one row has "statement" category
    const statementBadges = page.locator('text=statement')
    await expect(statementBadges.first()).toBeVisible()
  })

  test('transactions page shows data after upload', async ({ page }) => {
    await page.goto('/transactions')
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()

    // The transaction count should be non-zero
    const countText = await page.locator('p:has-text("of")').first().textContent()
    // Format: "25 of 25 transactions"
    if (countText) {
      const match = countText.match(/(\d+)\s+of\s+(\d+)/)
      if (match) {
        expect(parseInt(match[2], 10)).toBeGreaterThan(0)
      }
    }
  })

  test('dashboard shows non-zero averages after upload', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/Monthly Income/).first()).toBeVisible({ timeout: 10_000 })

    // At least one of the 12-month averages should be non-zero
    const avgIncome = await page.locator('text=Avg Monthly Income').locator('..').locator('p').first().textContent()
    const avgExpenses = await page.locator('text=Avg Monthly Expenses').locator('..').locator('p').first().textContent()

    // At least one average should be non-zero
    const incomeVal = parseFloat((avgIncome || '0').replace(/[^0-9.]/g, ''))
    const expenseVal = parseFloat((avgExpenses || '0').replace(/[^0-9.]/g, ''))
    expect(incomeVal + expenseVal).toBeGreaterThan(0)
  })
})

/**
 * Returns path to a real test statement PDF if one exists locally.
 * Returns null in CI or when no fixtures are available.
 */
function getTestStatementPath(): string | null {
  // Check for Corporate/2025/Primary as a test source
  const realStatementDir = '/Users/michaelyagudaev/Library/CloudStorage/GoogleDrive-michael@nano3labs.com/My Drive/Tax/Corporate/2025/Primary'
  try {
    const files = readdirSync(realStatementDir)
    const pdf = files.find((f: string) => f.endsWith('.pdf'))
    if (pdf) return join(realStatementDir, pdf)
  } catch {
    // Directory not available
  }

  // Check fixtures directory
  try {
    const files = readdirSync(TEST_FIXTURES_DIR)
    const pdf = files.find((f: string) => f.endsWith('.pdf'))
    if (pdf) return join(TEST_FIXTURES_DIR, pdf)
  } catch {
    // No fixtures
  }

  return null
}
