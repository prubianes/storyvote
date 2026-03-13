import { test, expect } from '@playwright/test'

test.describe('Smoke', () => {
  test('language toggle switches copy and persists after reload', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.removeItem('storyvote_language')
      sessionStorage.removeItem('storyvote_language')
    })
    await page.reload()

    await expect(page.getByRole('heading', { name: /bienvenidos a storyvote/i })).toBeVisible()

    await page.getByRole('button', { name: /cambiar idioma a ingles/i }).click()
    await expect(page.getByRole('heading', { name: /welcome to storyvote/i })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: /welcome to storyvote/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /switch language to spanish/i })).toBeVisible()
  })

  test('home renders and theme toggle switches html class', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.removeItem('storyvote_theme')
      sessionStorage.removeItem('storyvote_theme')
    })
    await page.reload()

    await expect(page.getByRole('heading', { name: /bienvenidos a storyvote/i })).toBeVisible()

    const themeButton = page.getByRole('button', { name: /activar modo/i })
    await expect(themeButton).toBeVisible()

    await expect(page.locator('html')).not.toHaveClass(/theme-light/)
    await themeButton.click()
    await expect(page.locator('html')).toHaveClass(/theme-light/)

    await page.reload()
    await expect(page.locator('html')).toHaveClass(/theme-light/)
  })

  test('custom not-found page shows and can return home', async ({ page }) => {
    await page.goto('/definitely-missing-route')

    await expect(page.getByRole('heading', { name: /página no encontrada/i })).toBeVisible()

    await page.getByRole('link', { name: /volver al inicio/i }).click()
    await expect(page).toHaveURL('/')
  })

  test('creating a new room requires admin passcode', async ({ page }) => {
    await page.route('**/rest/v1/rooms*', async (route, request) => {
      if (request.method() !== 'GET') {
        return route.continue()
      }

      // Emulate PostgREST singular/no-row response used by maybeSingle.
      await route.fulfill({
        status: 406,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'PGRST116',
          details: 'The result contains 0 rows',
          hint: null,
          message: 'JSON object requested, multiple (or no) rows returned',
        }),
      })
    })

    await page.goto('/')

    await page.getByLabel('Nombre').fill('qa-user')
    await page.getByLabel('Sala').fill('new-room-no-passcode')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page.getByText(/debes definir passcode admin/i)).toBeVisible()
    await expect(page).toHaveURL('/')
  })
})
