import { test, expect, Page } from '@playwright/test'

const SMOKE_USER = {
  name: 'Smoke Test User',
  email: `smoke-${Date.now()}@openfinance.test`,
  password: 'SmokeTestPass123!',
}

let userCreated = false

async function signUpOnce(page: Page) {
  if (userCreated) return loginUser(page)

  await page.goto('/auth/sign-up')
  await page.getByLabel('Name').fill(SMOKE_USER.name)
  await page.getByLabel('Email').fill(SMOKE_USER.email)
  await page.getByLabel('Password', { exact: true }).fill(SMOKE_USER.password)
  await page.getByLabel('Repeat Password').fill(SMOKE_USER.password)
  await page.getByRole('button', { name: 'Sign up', exact: true }).click()

  // Wait for redirect or error
  await page.waitForTimeout(3000)

  if (page.url().includes('/chat')) {
    userCreated = true
    return
  }

  // If sign-up failed (user might exist from a previous run), try login
  await loginUser(page)
  userCreated = true
}

async function loginUser(page: Page) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(SMOKE_USER.email)
  await page.getByLabel('Password').fill(SMOKE_USER.password)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL(/\/chat/, { timeout: 15_000 })
}

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

test.describe('Smoke Test: Authenticated User Journey', () => {
  test('sign up creates account and redirects to chat', async ({ page }) => {
    await signUpOnce(page)
    await expect(page).toHaveURL(/\/chat/)
  })

  test('all main pages are accessible', async ({ page }) => {
    await signUpOnce(page)

    // Dashboard
    await page.goto('/dashboard')
    await expect(page.getByText(/Monthly Income/)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Monthly Expenses/)).toBeVisible()

    // Transactions
    await page.goto('/transactions')
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()

    // Documents
    await page.goto('/documents')
    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible()

    // Statements
    await page.goto('/statements')
    await expect(page.getByRole('heading', { name: 'Statements' })).toBeVisible()
    await expect(page.getByText('PDF bank statements')).toBeVisible()

    // Settings
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  })

  test('settings page shows form fields and can save', async ({ page }) => {
    await signUpOnce(page)
    await page.goto('/settings')

    await expect(page.getByText('Fiscal Year End')).toBeVisible()
    await expect(page.getByText('AI Model')).toBeVisible()

    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText(/saved|updated/i)).toBeVisible({ timeout: 5_000 })
  })

  test('chat interface renders and accepts input', async ({ page }) => {
    await signUpOnce(page)

    const chatInput = page.getByPlaceholder(/message|ask|type/i)
    await expect(chatInput).toBeVisible({ timeout: 10_000 })
  })

  test('logout redirects to login page', async ({ page }) => {
    await signUpOnce(page)

    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 })

    // Verify protected route redirects when logged out
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
