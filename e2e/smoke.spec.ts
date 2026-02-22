import { test, expect } from '@playwright/test'

const SMOKE_USER = {
  name: 'Smoke Test User',
  email: `smoke-${Date.now()}@openfinance.test`,
  password: 'SmokeTestPass123!',
}

test.describe('Smoke Test: Full User Journey', () => {
  test.describe.configure({ mode: 'serial' })

  test('landing page renders with key sections', async ({ page }) => {
    await page.goto('/')

    // Hero section
    await expect(page.getByRole('heading', { name: /engineer your/i })).toBeVisible()

    // Hero badges (use .first() since text appears in multiple sections)
    await expect(page.getByText('Open Source').first()).toBeVisible()
    await expect(page.getByText('Self-Hosted').first()).toBeVisible()
    await expect(page.getByText('Privacy-First').first()).toBeVisible()

    // Features section
    await expect(page.getByText('AI-Powered Extraction')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Self-Hosted Privacy' })).toBeVisible()

    // Footer links
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

  test('sign up creates account and redirects to chat', async ({ page }) => {
    await page.goto('/auth/sign-up')
    await page.getByLabel('Name').fill(SMOKE_USER.name)
    await page.getByLabel('Email').fill(SMOKE_USER.email)
    await page.getByLabel('Password', { exact: true }).fill(SMOKE_USER.password)
    await page.getByLabel('Repeat Password').fill(SMOKE_USER.password)
    await page.getByRole('button', { name: 'Sign up', exact: true }).click()

    await expect(page).toHaveURL(/\/chat/, { timeout: 15_000 })
  })

  test('all main pages are accessible after login', async ({ page }) => {
    // Login
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill(SMOKE_USER.email)
    await page.getByLabel('Password').fill(SMOKE_USER.password)
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page).toHaveURL(/\/chat/, { timeout: 15_000 })

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
    // Verify uploader is present
    await expect(page.getByText('PDF bank statements')).toBeVisible()

    // Settings
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  })

  test('settings page shows form fields and can save', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill(SMOKE_USER.email)
    await page.getByLabel('Password').fill(SMOKE_USER.password)
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page).toHaveURL(/\/chat/, { timeout: 15_000 })

    await page.goto('/settings')

    // Check key settings fields are present
    await expect(page.getByText('Fiscal Year End')).toBeVisible()
    await expect(page.getByText('AI Model')).toBeVisible()

    // Save settings (should succeed even without changes)
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText(/saved|updated/i)).toBeVisible({ timeout: 5_000 })
  })

  test('chat interface renders and accepts input', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill(SMOKE_USER.email)
    await page.getByLabel('Password').fill(SMOKE_USER.password)
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page).toHaveURL(/\/chat/, { timeout: 15_000 })

    // Chat input should be present
    const chatInput = page.getByPlaceholder(/message|ask|type/i)
    await expect(chatInput).toBeVisible({ timeout: 10_000 })
  })

  test('logout redirects to login page', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill(SMOKE_USER.email)
    await page.getByLabel('Password').fill(SMOKE_USER.password)
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page).toHaveURL(/\/chat/, { timeout: 15_000 })

    // Sign out
    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 })

    // Verify protected route redirects when logged out
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
