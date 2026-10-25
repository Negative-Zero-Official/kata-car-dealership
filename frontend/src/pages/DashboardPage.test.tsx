import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import { expect, test } from 'vitest'
import type { Vehicle } from '../api/vehicles'
import { AuthProvider } from '../auth/AuthContext'
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
const crv: Vehicle = {
  id: 2,
  make: 'Honda',
  model: 'CR-V',
  category: 'SUV',
  price: '32499.50',
  quantity: 0,
}

function renderDashboard() {
  render(
    <AuthProvider>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </AuthProvider>,
  )
}

test('shows a loading state, then a card per vehicle', async () => {
  server.use(http.get('/api/vehicles', () => HttpResponse.json([corolla, crv])))
  renderDashboard()

  expect(screen.getByRole('status')).toHaveTextContent('Loading vehicles')

  const cards = await screen.findAllByRole('listitem')
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(cards).toHaveLength(2)

  const first = within(cards[0])
  expect(first.getByRole('heading', { name: 'Toyota Corolla' })).toBeInTheDocument()
  expect(first.getByText('Sedan')).toBeInTheDocument()
  expect(first.getByText('$25,000.00')).toBeInTheDocument()
  expect(first.getByText('5 in stock')).toBeInTheDocument()

  const second = within(cards[1])
  expect(second.getByRole('heading', { name: 'Honda CR-V' })).toBeInTheDocument()
  expect(second.getByText('SUV')).toBeInTheDocument()
  expect(second.getByText('$32,499.50')).toBeInTheDocument()
  expect(second.getByText('0 in stock')).toBeInTheDocument()
})

test('shows an empty state when there are no vehicles', async () => {
  server.use(http.get('/api/vehicles', () => HttpResponse.json([])))
  renderDashboard()

  expect(await screen.findByText('No vehicles yet')).toBeInTheDocument()
  expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
})

test('shows an error with Retry, which loads the vehicles again', async () => {
  let calls = 0
  server.use(
    http.get('/api/vehicles', () => {
      calls += 1
      return calls === 1
        ? HttpResponse.json({ detail: 'Internal Server Error' }, { status: 500 })
        : HttpResponse.json([corolla])
    }),
  )
  renderDashboard()

  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load vehicles')

  await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }))

  expect(await screen.findByRole('heading', { name: 'Toyota Corolla' })).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(calls).toBe(2)
})

async function findCard(name: string) {
  const heading = await screen.findByRole('heading', { name })
  return within(heading.closest('li')!)
}

test('a vehicle with no stock has a disabled Sold out button', async () => {
  server.use(http.get('/api/vehicles', () => HttpResponse.json([corolla, crv])))
  renderDashboard()

  const soldOut = await findCard('Honda CR-V')
  expect(soldOut.getByRole('button', { name: 'Sold out' })).toBeDisabled()
  expect(soldOut.queryByRole('button', { name: 'Purchase' })).not.toBeInTheDocument()

  const inStock = await findCard('Toyota Corolla')
  expect(inStock.getByRole('button', { name: 'Purchase' })).toBeEnabled()
})

test('purchasing calls the API and the card shows one fewer in stock', async () => {
  let purchased: string | null = null
  server.use(
    http.get('/api/vehicles', () => HttpResponse.json([corolla])),
    http.post('/api/vehicles/:id/purchase', ({ params }) => {
      purchased = params.id as string
      return HttpResponse.json({ ...corolla, quantity: corolla.quantity - 1 })
    }),
  )
  renderDashboard()
  const card = await findCard('Toyota Corolla')

  await userEvent.setup().click(card.getByRole('button', { name: 'Purchase' }))

  expect(await card.findByText('4 in stock')).toBeInTheDocument()
  expect(purchased).toBe('1')
})

test('a 409 on purchase shows an error toast and leaves the stock unchanged', async () => {
  server.use(
    http.get('/api/vehicles', () => HttpResponse.json([corolla])),
    http.post('/api/vehicles/:id/purchase', () =>
      HttpResponse.json({ detail: 'Vehicle is out of stock' }, { status: 409 }),
    ),
  )
  renderDashboard()
  const card = await findCard('Toyota Corolla')

  await userEvent.setup().click(card.getByRole('button', { name: 'Purchase' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Vehicle is out of stock')
  expect(card.getByText('5 in stock')).toBeInTheDocument()
})
