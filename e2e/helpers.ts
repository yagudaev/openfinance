import { Page, expect } from '@playwright/test'

const AUTH_EMAIL = 'e2e-test@openfinance.test'
const AUTH_PASSWORD = 'E2eTestPass123!'
const AUTH_NAME = 'E2E Test User'

export async function ensureLoggedIn(page: Page) {
  await page.goto('/dashboard')

  // If redirected to login, create account or log in
  if (page.url().includes('/auth/login')) {
    // Try to log in first
    await page.getByLabel('Email').fill(AUTH_EMAIL)
    await page.getByLabel('Password').fill(AUTH_PASSWORD)
    await page.getByRole('button', { name: 'Login' }).click()

    // Wait a moment for the response
    await page.waitForTimeout(2000)

    // If still on login page (user doesn't exist), sign up instead
    if (page.url().includes('/auth/login')) {
      await page.goto('/auth/sign-up')
      await page.getByLabel('Name').fill(AUTH_NAME)
      await page.getByLabel('Email').fill(AUTH_EMAIL)
      await page.getByLabel('Password', { exact: true }).fill(AUTH_PASSWORD)
      await page.getByLabel('Repeat Password').fill(AUTH_PASSWORD)
      await page.getByRole('button', { name: 'Sign up' }).click()
    }

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  }
}
