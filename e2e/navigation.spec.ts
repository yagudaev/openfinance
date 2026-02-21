import { test, expect } from '@playwright/test'
import { ensureLoggedIn } from './helpers'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page)
  })

  test('can navigate to transactions page', async ({ page }) => {
    await page.getByRole('link', { name: 'Transactions' }).click()
    await expect(page).toHaveURL(/\/transactions/)
    await expect(page.getByText(/transactions/i)).toBeVisible()
  })

  test('can navigate to statements page', async ({ page }) => {
    await page.getByRole('link', { name: 'Statements' }).click()
    await expect(page).toHaveURL(/\/statements/)
    await expect(page.getByText(/statements/i)).toBeVisible()
  })

  test('can navigate to chat page', async ({ page }) => {
    await page.getByRole('link', { name: 'Chat' }).click()
    await expect(page).toHaveURL(/\/chat/)
  })

  test('can navigate to settings page', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.getByText(/settings/i)).toBeVisible()
  })

  test('can navigate back to dashboard from any page', async ({ page }) => {
    await page.goto('/transactions')
    await page.getByRole('link', { name: 'Home' }).click()
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
