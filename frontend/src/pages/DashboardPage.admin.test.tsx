import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, test } from 'vitest'
import type { Role } from '../api/auth'
import type { Vehicle } from '../api/vehicles'
import { AuthProvider, SESSION_STORAGE_KEY } from '../auth/AuthContext'
import { server } from '../mocks/server'
import { DashboardPage } from './DashboardPage'

const corolla: Vehicle = {
  id: 1,
  make: 'Toyota',
  model: 'Corolla',
  category: 'Sedan',
  price: '25000.00',
  quantity: 5,
}

function signInAs(role: Role) {
  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({ token: 'a.b.c', user: { id: 1, email: `${role}@example.com`, role } }),
  )
}

async function renderDashboard() {
  render(
    <AuthProvider>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </AuthProvider>,
  )
  await screen.findByRole('heading', { name: 'Toyota Corolla' })
}

async function openAddVehicleForm() {
  await userEvent.setup().click(screen.getByRole('button', { name: 'Add vehicle' }))
  return within(screen.getByRole('form', { name: 'Add vehicle' }))
}

beforeEach(() => {
  server.use(http.get('/api/vehicles', () => HttpResponse.json([corolla])))
})

afterEach(() => localStorage.clear())

test('the Add vehicle button shows for admins', async () => {
  signInAs('admin')
  await renderDashboard()

  expect(screen.getByRole('button', { name: 'Add vehicle' })).toBeInTheDocument()
})

test('the Add vehicle button is hidden from regular users', async () => {
  signInAs('user')
  await renderDashboard()

  expect(screen.queryByRole('button', { name: 'Add vehicle' })).not.toBeInTheDocument()
})

test('submitting an empty form shows an error on every field and sends no request', async () => {
  let posted = false
  server.use(
    http.post('/api/vehicles', () => {
      posted = true
      return HttpResponse.json(corolla, { status: 201 })
    }),
  )
  signInAs('admin')
  await renderDashboard()
  const form = await openAddVehicleForm()

  await userEvent.setup().click(form.getByRole('button', { name: 'Save vehicle' }))

  expect(form.getByLabelText('Make')).toHaveAccessibleDescription('Enter a make')
  expect(form.getByLabelText('Model')).toHaveAccessibleDescription('Enter a model')
  expect(form.getByLabelText('Category')).toHaveAccessibleDescription('Enter a category')
  expect(form.getByLabelText('Price')).toHaveAccessibleDescription('Enter a price above 0')
  expect(form.getByLabelText('Quantity')).toHaveAccessibleDescription(
    'Enter a whole number of 0 or more',
  )
  expect(posted).toBe(false)
})

test('a zero price and a negative quantity are rejected', async () => {
  signInAs('admin')
  await renderDashboard()
  const form = await openAddVehicleForm()
  const user = userEvent.setup()

  await user.type(form.getByLabelText('Make'), 'Mazda')
  await user.type(form.getByLabelText('Model'), 'CX-5')
  await user.type(form.getByLabelText('Category'), 'SUV')
  await user.type(form.getByLabelText('Price'), '0')
  await user.type(form.getByLabelText('Quantity'), '-1')
  await user.click(form.getByRole('button', { name: 'Save vehicle' }))

  expect(form.getByLabelText('Price')).toHaveAccessibleDescription('Enter a price above 0')
  expect(form.getByLabelText('Quantity')).toHaveAccessibleDescription(
    'Enter a whole number of 0 or more',
  )
  expect(form.getByLabelText('Make')).not.toHaveAccessibleDescription()
})

test('a valid submit POSTs the vehicle and its card appears', async () => {
  let body: unknown
  server.use(
    http.post('/api/vehicles', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json(
        { id: 2, make: 'Mazda', model: 'CX-5', category: 'SUV', price: '27500.00', quantity: 3 },
        { status: 201 },
      )
    }),
  )
  signInAs('admin')
  await renderDashboard()
  const form = await openAddVehicleForm()
  const user = userEvent.setup()

  await user.type(form.getByLabelText('Make'), 'Mazda')
  await user.type(form.getByLabelText('Model'), 'CX-5')
  await user.type(form.getByLabelText('Category'), 'SUV')
  await user.type(form.getByLabelText('Price'), '27500')
  await user.type(form.getByLabelText('Quantity'), '3')
  await user.click(form.getByRole('button', { name: 'Save vehicle' }))

  const card = within((await screen.findByRole('heading', { name: 'Mazda CX-5' })).closest('li')!)
  expect(card.getByText('$27,500.00')).toBeInTheDocument()
  expect(card.getByText('3 in stock')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Toyota Corolla' })).toBeInTheDocument()
  expect(body).toEqual({
    make: 'Mazda',
    model: 'CX-5',
    category: 'SUV',
    price: '27500',
    quantity: 3,
  })
})

function corollaCard() {
  return within(screen.getByRole('heading', { name: 'Toyota Corolla' }).closest('li')!)
}

test('Edit is hidden from regular users', async () => {
  signInAs('user')
  await renderDashboard()

  expect(corollaCard().queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
})

test('Edit opens a form pre-filled with the vehicle details', async () => {
  signInAs('admin')
  await renderDashboard()

  await userEvent.setup().click(corollaCard().getByRole('button', { name: 'Edit' }))

  const form = within(screen.getByRole('form', { name: 'Edit vehicle' }))
  expect(form.getByLabelText('Make')).toHaveValue('Toyota')
  expect(form.getByLabelText('Model')).toHaveValue('Corolla')
  expect(form.getByLabelText('Category')).toHaveValue('Sedan')
  expect(form.getByLabelText('Price')).toHaveValue(25000)
  expect(form.queryByLabelText('Quantity')).not.toBeInTheDocument()
})

test('Save sends a PUT with the edited details and the card updates', async () => {
  let request: { id: string; body: unknown } | null = null
  server.use(
    http.put('/api/vehicles/:id', async ({ params, request: req }) => {
      request = { id: params.id as string, body: await req.json() }
      return HttpResponse.json({ ...corolla, model: 'Corolla Cross', price: '26000.00' })
    }),
  )
  signInAs('admin')
  await renderDashboard()
  const user = userEvent.setup()
  await user.click(corollaCard().getByRole('button', { name: 'Edit' }))
  const form = within(screen.getByRole('form', { name: 'Edit vehicle' }))

  await user.clear(form.getByLabelText('Model'))
  await user.type(form.getByLabelText('Model'), 'Corolla Cross')
  await user.clear(form.getByLabelText('Price'))
  await user.type(form.getByLabelText('Price'), '26000')
  await user.click(form.getByRole('button', { name: 'Save vehicle' }))

  const card = within(
    (await screen.findByRole('heading', { name: 'Toyota Corolla Cross' })).closest('li')!,
  )
  expect(card.getByText('$26,000.00')).toBeInTheDocument()
  expect(card.getByText('5 in stock')).toBeInTheDocument()
  expect(screen.queryByRole('form', { name: 'Edit vehicle' })).not.toBeInTheDocument()
  expect(request).toEqual({
    id: '1',
    body: { make: 'Toyota', model: 'Corolla Cross', category: 'Sedan', price: '26000' },
  })
})
