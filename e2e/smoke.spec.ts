import { test, expect } from '@playwright/test'
import { ensureLoggedIn } from './helpers'

test.describe('Smoke Test: Public Pages', () => {
  test('landing page renders with key sections', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: /engineer your/i })).toBeVisible()
    await expect(page.getByText('Open Source').first()).toBeVisible()
    await expect(page.getByText('Self-Hosted').first()).toBeVisible()
    await expect(page.getByText('Privacy-First').first()).toBeVisible()

    await expect(page.getByText('AI-Powered Extraction')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Self-Hosted Privacy' })).toBeVisible()

    await expect(page.getByRole('link', { name: 'Terms of Service' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Privacy Policy' })).toBeVisible()
  })

  test('terms page renders', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible({ timeout: 10_000 })
  })

  test('privacy page renders', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Smoke Test: Authenticated Pages', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page)
  })

  test('all main pages are accessible', async ({ page }) => {
    // Dashboard
    await page.goto('/dashboard')
    await expect(page.getByText(/Monthly Income/).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Monthly Expenses/).first()).toBeVisible()

    // Transactions
    await page.goto('/transactions')
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()

    // Documents
    await page.goto('/documents')
    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible()

    // Statements
    await page.goto('/statements')
    await expect(page.getByRole('heading', { name: 'Statements' })).toBeVisible()

    // Settings
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  })

  test('settings page shows form fields and can save', async ({ page }) => {
    await page.goto('/settings')

    await expect(page.getByText('Fiscal Year End')).toBeVisible()
    await expect(page.getByText('AI Assistant')).toBeVisible()

    await page.getByRole('button', { name: /save/i }).first().click()
    await expect(page.getByText(/saved|updated/i)).toBeVisible({ timeout: 5_000 })
  })

  test('chat interface renders', async ({ page }) => {
    const chatInput = page.getByPlaceholder(/message|ask|type/i)
    await expect(chatInput).toBeVisible({ timeout: 10_000 })
  })
})
