import { test, expect } from '@playwright/test'

const PROD_URL = 'https://openfinance.to'

test.describe('Production Deployment', () => {
  test('app loads with SSL at openfinance.to', async ({ page }) => {
    await page.goto(PROD_URL)

    // Should show marketing landing page for unauthenticated users
    await expect(page).toHaveURL(PROD_URL + '/')
    await expect(page.getByRole('heading', { name: 'Engineer your financial future' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
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
    await page.getByRole('button', { name: 'Sign up', exact: true }).click()

    // Should arrive at chat (home page)
    await expect(page).toHaveURL(/\/chat/, { timeout: 15_000 })
    await expect(page.getByText('OpenFinance')).toBeVisible()

    // Navigate to each page
    await page.getByRole('link', { name: 'Transactions' }).click()
    await expect(page).toHaveURL(/\/transactions/)

    await page.getByRole('link', { name: 'Statements' }).click()
    await expect(page).toHaveURL(/\/statements/)

    await page.getByRole('link', { name: 'Home' }).click()
    await expect(page).toHaveURL(/\/chat/)

    await page.goto(`${PROD_URL}/settings`)
    await expect(page).toHaveURL(/\/settings/)

    // Sign out via profile dropdown
    await page.getByRole('button', { name: 'User menu' }).click()
    await page.getByRole('menuitem', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 })
  })
})
