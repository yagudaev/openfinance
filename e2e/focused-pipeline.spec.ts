import { test, expect } from '@playwright/test'
import { ensureLoggedIn } from './helpers'

/**
 * Focused pipeline acceptance test: upload a single US Incoming statement,
 * verify the full pipeline produces exact expected results including
 * account creation, transaction extraction, balance verification, and net worth.
 */

const TEST_PDF_PATH =
  '/Users/michaelyagudaev/Library/CloudStorage/GoogleDrive-michael@nano3labs.com/My Drive/Tax/Corporate/2026/US Incoming/007-US Incoming Statement-1442 2026-02-19.pdf'

test.describe('Focused Pipeline: US Incoming Statement', () => {
  // AI processing + multi-page verification needs generous timeout
  test.setTimeout(180_000)

  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page)

    // Clean slate: delete all financial data for the test user
    const resetResult = await page.evaluate(() =>
      fetch('/api/data/reset', { method: 'DELETE' }).then(r => r.json()),
    )
    expect(resetResult.success).toBe(true)
  })

  test('single statement produces exact expected results', async ({ page }) => {
    // Skip if the test PDF isn't available on this machine
    const { existsSync } = require('fs')
    if (!existsSync(TEST_PDF_PATH)) {
      test.skip(true, 'Test PDF not available — skipping focused pipeline test')
      return
    }

    // ── Step 1: Upload the statement ──
    await page.goto('/statements')
    await expect(page.getByRole('heading', { name: 'Statements' })).toBeVisible()

    // Uppy has two file inputs (files + directory); use the first one
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(TEST_PDF_PATH)

    // Uppy requires clicking the upload button (autoProceed is off)
    await page.getByRole('button', { name: /Upload 1 file/i }).click()

    // Wait for processing to start (banner message)
    await expect(page.getByText('Processing statements with AI')).toBeVisible({ timeout: 15_000 })

    // Wait for processing to complete (toast message from single-file processing)
    await expect(page.getByText(/transactions extracted/i)).toBeVisible({ timeout: 120_000 })

    // ── Step 2: Verify statement row on Statements page ──
    await page.goto('/statements')
    await expect(page.getByRole('heading', { name: 'Statements' })).toBeVisible()

    // Should have exactly 1 statement row
    const rows = page.locator('tbody tr')
    await expect(rows).toHaveCount(1)

    // Bank name should be Royal Bank of Canada
    const bankCell = rows.first().locator('td').nth(0)
    await expect(bankCell).toContainText('Royal Bank of Canada')

    // Account number column
    const accountCell = rows.first().locator('td').nth(2)
    await expect(accountCell).toContainText('144-2')

    // Transaction count should be 1
    const txCountCell = rows.first().locator('td').nth(3)
    await expect(txCountCell).toHaveText('1')

    // ── Step 3: Verify statement detail page ──
    await bankCell.locator('a').click()
    await page.waitForURL(/\/statements\//)

    // Header shows bank name and balanced status
    await expect(page.getByText('Royal Bank of Canada').first()).toBeVisible()
    await expect(page.getByText('Balanced')).toBeVisible()

    // Summary cards: Opening Balance, Closing Balance, Net Change
    await expect(page.getByText('Opening Balance')).toBeVisible()
    await expect(page.getByText('$85,896.42').first()).toBeVisible()
    await expect(page.getByText('Closing Balance')).toBeVisible()
    await expect(page.getByText('$76,696.42').first()).toBeVisible()
    await expect(page.getByText('-$9,200.00').first()).toBeVisible()

    // Account number
    await expect(page.getByText('06720 400-144-2')).toBeVisible()

    // Transaction table: 1 transaction
    await expect(page.getByText('Transactions (1)')).toBeVisible()
    await expect(page.getByText('BR TO BR - 3345')).toBeVisible()

    // ── Step 4: Verify transactions page ──
    await page.goto('/transactions')
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()

    // Should show "1 of 1 transactions"
    await expect(page.getByText('1 of 1 transactions')).toBeVisible()

    // Transaction description
    await expect(page.getByText('BR TO BR')).toBeVisible()

    // ── Step 5: Verify net worth page ──
    await page.goto('/net-worth')
    await expect(page.getByText('Net Worth').first()).toBeVisible()

    // Net worth should equal the closing balance ($76,696.42 shown as $76,696 — no cents)
    await expect(page.getByText('$76,696').first()).toBeVisible()

    // Total assets card
    await expect(page.getByText('Total Assets')).toBeVisible()

    // Should show the bank account in the account list (scroll down to see it)
    await expect(page.getByText('Royal Bank of Canada')).toBeVisible()
  })
})
