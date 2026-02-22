import { Page, expect } from '@playwright/test'

const AUTH_EMAIL = 'e2e-test@openfinance.test'
const AUTH_PASSWORD = 'E2eTestPass123!'
const AUTH_NAME = 'E2E Test User'

export async function ensureLoggedIn(page: Page) {
  // Check if already logged in
  await page.goto('/chat')

  if (!page.url().includes('/auth/')) {
    return
  }

  // Try login first (faster if user already exists from a previous test)
  if (await tryLogin(page)) return

  // Login failed — user probably doesn't exist yet, sign up
  if (await trySignUp(page)) return

  // Sign up may have failed because user was created by another test — retry login
  if (await tryLogin(page)) return

  throw new Error('Could not log in or sign up the E2E test user')
}

async function tryLogin(page: Page): Promise<boolean> {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(AUTH_EMAIL)
  await page.getByLabel('Password').fill(AUTH_PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()

  try {
    await expect(page).toHaveURL(/\/chat/, { timeout: 10_000 })
    return true
  } catch {
    return false
  }
}

async function trySignUp(page: Page): Promise<boolean> {
  await page.goto('/auth/sign-up')
  await page.getByLabel('Name').fill(AUTH_NAME)
  await page.getByLabel('Email').fill(AUTH_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(AUTH_PASSWORD)
  await page.getByLabel('Repeat Password').fill(AUTH_PASSWORD)
  await page.getByRole('button', { name: 'Sign up', exact: true }).click()

  try {
    await expect(page).toHaveURL(/\/chat/, { timeout: 15_000 })
    return true
  } catch {
    return false
  }
}
