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
    await expect(page.getByText(/^Monthly Income/)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/^Monthly Expenses/)).toBeVisible()
    await expect(page.getByText(/^Avg Monthly Income/)).toBeVisible()

    // Cashflow chart should be visible
    await expect(page.getByText('Cashflow (Last 12 Months)')).toBeVisible()
  })

  test('navbar navigation links are present', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Transactions' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Documents' })).toBeVisible()
  })
})
