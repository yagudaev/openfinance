import { Page, expect } from '@playwright/test'

const AUTH_EMAIL = 'e2e-test@openfinance.test'
const AUTH_PASSWORD = 'E2eTestPass123!'
const AUTH_NAME = 'E2E Test User'

export async function ensureLoggedIn(page: Page) {
  // Check if already logged in
  await page.goto('/chat')

  // If we're on /chat, we're already logged in
  if (!page.url().includes('/auth/')) {
    return
  }

  // Try login first (faster if user already exists from a previous test)
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(AUTH_EMAIL)
  await page.getByLabel('Password').fill(AUTH_PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()

  // Wait for either redirect to /chat or an error to appear
  try {
    await expect(page).toHaveURL(/\/chat/, { timeout: 5_000 })
    return
  } catch {
    // Login failed — user probably doesn't exist yet, sign up
  }

  await page.goto('/auth/sign-up')
  await page.getByLabel('Name').fill(AUTH_NAME)
  await page.getByLabel('Email').fill(AUTH_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(AUTH_PASSWORD)
  await page.getByLabel('Repeat Password').fill(AUTH_PASSWORD)
  await page.getByRole('button', { name: 'Sign up', exact: true }).click()

  await expect(page).toHaveURL(/\/chat/, { timeout: 15_000 })
}
