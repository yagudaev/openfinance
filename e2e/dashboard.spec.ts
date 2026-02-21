import { test, expect } from '@playwright/test'
import { ensureLoggedIn } from './helpers'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page)
  })

  test('renders dashboard page with stats and chart', async ({ page }) => {
    await page.goto('/dashboard')

    // Navbar should be visible
    await expect(page.getByText('OpenFinance')).toBeVisible()

    // Dashboard should show stat cards
    await expect(page.getByText(/total income|revenue/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/total expenses|spending/i)).toBeVisible()
    await expect(page.getByText(/net income|net cashflow|balance/i)).toBeVisible()
  })

  test('navbar navigation links are present', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Transactions' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Statements' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Chat' })).toBeVisible()
  })
})
