import { test, expect } from '@playwright/test'

const PROD_URL = 'https://openfinance.to'

test.describe('Production Deployment', () => {
  test('app loads with SSL at openfinance.to', async ({ page }) => {
    await page.goto(PROD_URL)

    // Should redirect to login (auth middleware working)
    await expect(page).toHaveURL(new RegExp(`${PROD_URL}/auth/login`))
    await expect(page.getByText('Login', { exact: true }).first()).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
  })

  test('sign up page accessible in production', async ({ page }) => {
    await page.goto(`${PROD_URL}/auth/sign-up`)

    await expect(page.getByText('Sign up', { exact: true }).first()).toBeVisible()
    await expect(page.getByLabel('Name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
  })

  test('full production flow: sign up, navigate, sign out', async ({ page }) => {
    const prodEmail = `prod-test-${Date.now()}@openfinance.test`
    const prodPassword = 'ProdTest123!'

    // Sign up
    await page.goto(`${PROD_URL}/auth/sign-up`)
    await page.getByLabel('Name').fill('Prod Test User')
    await page.getByLabel('Email').fill(prodEmail)
    await page.getByLabel('Password', { exact: true }).fill(prodPassword)
    await page.getByLabel('Repeat Password').fill(prodPassword)
    await page.getByRole('button', { name: 'Sign up' }).click()

    // Should arrive at dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    await expect(page.getByText('OpenFinance')).toBeVisible()

    // Navigate to each page
    await page.getByRole('link', { name: 'Transactions' }).click()
    await expect(page).toHaveURL(/\/transactions/)

    await page.getByRole('link', { name: 'Statements' }).click()
    await expect(page).toHaveURL(/\/statements/)

    await page.getByRole('link', { name: 'Chat' }).click()
    await expect(page).toHaveURL(/\/chat/)

    await page.goto(`${PROD_URL}/settings`)
    await expect(page).toHaveURL(/\/settings/)

    // Sign out
    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 })
  })
})
