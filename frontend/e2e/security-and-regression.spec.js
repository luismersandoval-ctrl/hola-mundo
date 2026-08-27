import { expect, test } from '@playwright/test'

test('rechaza credenciales manipuladas y muestra un error seguro', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Usuario o correo').fill("' OR 1=1 --")
  await page.locator('#password').fill('incorrecta')
  await page.getByRole('button', { name: /Ingresar/i }).click()
  await expect(page.getByRole('alert')).toContainText(/incorrectos/i)
  await expect(page).toHaveURL(/\/login$/)
})

test('login aterriza en dashboard y conserva las rutas principales', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Usuario o correo').fill('admin')
  await page.locator('#password').fill('AdminTest123!')
  await page.getByRole('button', { name: /Ingresar/i }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Dashboard', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Agenda', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Historia Clínica', { exact: true }).first()).toBeVisible()
})

test('API aislada rechaza mass assignment y conserva apóstrofes', async ({ request }) => {
  const tokenResponse = await request.post('/api/token', { form: { username: 'admin', password: 'AdminTest123!' } })
  expect(tokenResponse.ok()).toBeTruthy()
  const token = (await tokenResponse.json()).access_token
  const headers = { Authorization: `Bearer ${token}` }

  const rejected = await request.post('/api/patients/', { headers, data: { first_name: 'Eve', clinic_id: 999 } })
  expect(rejected.status()).toBe(422)

  const created = await request.post('/api/patients/', { headers, data: { first_name: 'María', first_surname: "O'Connor" } })
  expect(created.ok()).toBeTruthy()
  expect((await created.json()).name).toContain("O'Connor")

  const oversized = await request.get('/api/patients/?limit=501', { headers })
  expect(oversized.status()).toBe(422)
})
