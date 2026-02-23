import { test, expect } from '@playwright/test'

const TEST_USER = {
  name: 'Test User',
  email: `test-${Date.now()}@openfinance.test`,
  password: 'TestPass123!',
}

test.describe('Auth Pages', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/auth/login')

    await expect(page.getByText('Login', { exact: true }).first()).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible()
  })

  test('sign up page renders correctly', async ({ page }) => {
    await page.goto('/auth/sign-up')

    await expect(page.getByText('Sign up', { exact: true }).first()).toBeVisible()
    await expect(page.getByLabel('Name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Repeat Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign up', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible()
  })

  test('can navigate from login to sign up', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByRole('link', { name: 'Sign up' }).click()
    await expect(page).toHaveURL(/\/auth\/sign-up/)
  })

  test('can navigate from sign up to login', async ({ page }) => {
    await page.goto('/auth/sign-up')
    await page.getByRole('link', { name: 'Login' }).click()
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('shows error on mismatched passwords', async ({ page }) => {
    await page.goto('/auth/sign-up')
    await page.getByLabel('Name').fill('Test')
    await page.getByLabel('Email').fill('test@test.com')
    await page.getByLabel('Password', { exact: true }).fill('password1')
    await page.getByLabel('Repeat Password').fill('password2')
    await page.getByRole('button', { name: 'Sign up', exact: true }).click()

    await expect(page.getByText('Passwords do not match')).toBeVisible()
  })

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

test.describe('Auth Flow', () => {
  test('sign up, login, and access protected pages', async ({ page }) => {
    // Sign up
    await page.goto('/auth/sign-up')
    await page.getByLabel('Name').fill(TEST_USER.name)
    await page.getByLabel('Email').fill(TEST_USER.email)
    await page.getByLabel('Password', { exact: true }).fill(TEST_USER.password)
    await page.getByLabel('Repeat Password').fill(TEST_USER.password)
    await page.getByRole('button', { name: 'Sign up', exact: true }).click()

    // Should redirect to chat after sign up
    await expect(page).toHaveURL(/\/chat/, { timeout: 15_000 })
    await expect(page.getByText('OpenFinance').first()).toBeVisible()

    // Sign out via profile dropdown
    await page.getByRole('button', { name: 'User menu' }).click()
    await page.getByRole('menuitem', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 })

    // Log back in
    await page.getByLabel('Email').fill(TEST_USER.email)
    await page.getByLabel('Password').fill(TEST_USER.password)
    await page.getByRole('button', { name: 'Login' }).click()

    // Should redirect to chat after login
    await expect(page).toHaveURL(/\/chat/, { timeout: 15_000 })
  })
})
