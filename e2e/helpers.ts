import { Page, expect } from '@playwright/test'

const AUTH_EMAIL = 'e2e-test@openfinance.test'
const AUTH_PASSWORD = 'E2eTestPass123!'
const AUTH_NAME = 'E2E Test User'

export async function ensureLoggedIn(page: Page) {
  // First try: sign up (creates account if needed)
  await page.goto('/auth/sign-up')
  await page.getByLabel('Name').fill(AUTH_NAME)
  await page.getByLabel('Email').fill(AUTH_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(AUTH_PASSWORD)
  await page.getByLabel('Repeat Password').fill(AUTH_PASSWORD)
  await page.getByRole('button', { name: 'Sign up', exact: true }).click()

  // Wait for either redirect to chat or error (user already exists)
  await page.waitForTimeout(2000)

  // If sign-up failed (user exists), fall back to login
  if (page.url().includes('/auth/')) {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill(AUTH_EMAIL)
    await page.getByLabel('Password').fill(AUTH_PASSWORD)
    await page.getByRole('button', { name: 'Login' }).click()
  }

  await expect(page).toHaveURL(/\/chat/, { timeout: 15_000 })
}
