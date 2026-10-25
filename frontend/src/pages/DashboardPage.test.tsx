import { render, screen, waitFor, within } from '@testing-library/react'
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
  const user = userEvent.setup()

  await user.click(card.getByRole('button', { name: 'Purchase' }))
  await user.click(screen.getByRole('button', { name: 'Confirm purchase' }))

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
  const user = userEvent.setup()

  await user.click(card.getByRole('button', { name: 'Purchase' }))
  await user.click(screen.getByRole('button', { name: 'Confirm purchase' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Vehicle is out of stock')
  expect(card.getByText('5 in stock')).toBeInTheDocument()
})

test('submitting the filters searches with only the non-empty params', async () => {
  let searchParams: Record<string, string> | null = null
  server.use(
    http.get('/api/vehicles', () => HttpResponse.json([corolla, crv])),
    http.get('/api/vehicles/search', ({ request }) => {
      searchParams = Object.fromEntries(new URL(request.url).searchParams)
      return HttpResponse.json([corolla])
    }),
  )
  renderDashboard()
  await screen.findByRole('heading', { name: 'Honda CR-V' })
  const user = userEvent.setup()

  await user.type(screen.getByLabelText('Make'), 'toyota')
  await user.type(screen.getByLabelText('Max price'), '30000')
  await user.click(screen.getByRole('button', { name: 'Search' }))

  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: 'Honda CR-V' })).not.toBeInTheDocument(),
  )
  expect(screen.getByRole('heading', { name: 'Toyota Corolla' })).toBeInTheDocument()
  expect(searchParams).toEqual({ make: 'toyota', max_price: '30000' })
})

test('Clear empties the filters and restores the full list', async () => {
  server.use(
    http.get('/api/vehicles', () => HttpResponse.json([corolla, crv])),
    http.get('/api/vehicles/search', () => HttpResponse.json([corolla])),
  )
  renderDashboard()
  await screen.findByRole('heading', { name: 'Honda CR-V' })
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Make'), 'toyota')
  await user.click(screen.getByRole('button', { name: 'Search' }))
  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: 'Honda CR-V' })).not.toBeInTheDocument(),
  )

  await user.click(screen.getByRole('button', { name: 'Clear' }))

  expect(await screen.findByRole('heading', { name: 'Honda CR-V' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Toyota Corolla' })).toBeInTheDocument()
  expect(screen.getByLabelText('Make')).toHaveValue('')
})

test('a min price above the max price shows an inline error and sends no request', async () => {
  let searched = false
  server.use(
    http.get('/api/vehicles', () => HttpResponse.json([corolla, crv])),
    http.get('/api/vehicles/search', () => {
      searched = true
      return HttpResponse.json([])
    }),
  )
  renderDashboard()
  await screen.findByRole('heading', { name: 'Honda CR-V' })
  const user = userEvent.setup()

  await user.type(screen.getByLabelText('Min price'), '40000')
  await user.type(screen.getByLabelText('Max price'), '30000')
  await user.click(screen.getByRole('button', { name: 'Search' }))

  expect(screen.getByLabelText('Max price')).toHaveAccessibleDescription(
    'Max price must be at least the min price',
  )
  expect(searched).toBe(false)
  expect(screen.getByRole('heading', { name: 'Honda CR-V' })).toBeInTheDocument()
})

test('Purchase asks for confirmation, showing the vehicle and price, before sending anything', async () => {
  let purchased = false
  server.use(
    http.get('/api/vehicles', () => HttpResponse.json([corolla])),
    http.post('/api/vehicles/:id/purchase', () => {
      purchased = true
      return HttpResponse.json({ ...corolla, quantity: 4 })
    }),
  )
  renderDashboard()
  const card = await findCard('Toyota Corolla')
  const user = userEvent.setup()

  await user.click(card.getByRole('button', { name: 'Purchase' }))

  const confirm = within(screen.getByRole('alertdialog', { name: 'Buy Toyota Corolla?' }))
  expect(confirm.getByText(/\$25,000\.00/)).toBeInTheDocument()
  expect(purchased).toBe(false)

  await user.click(confirm.getByRole('button', { name: 'Cancel' }))

  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  expect(card.getByText('5 in stock')).toBeInTheDocument()
  expect(purchased).toBe(false)
})

test('confirming a purchase buys the vehicle and shows a success toast', async () => {
  server.use(
    http.get('/api/vehicles', () => HttpResponse.json([corolla])),
    http.post('/api/vehicles/:id/purchase', () =>
      HttpResponse.json({ ...corolla, quantity: corolla.quantity - 1 }),
    ),
  )
  renderDashboard()
  const card = await findCard('Toyota Corolla')
  const user = userEvent.setup()

  await user.click(card.getByRole('button', { name: 'Purchase' }))
  const confirm = within(screen.getByRole('alertdialog', { name: 'Buy Toyota Corolla?' }))
  await user.click(confirm.getByRole('button', { name: 'Confirm purchase' }))

  expect(await card.findByText('4 in stock')).toBeInTheDocument()
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('Purchased Toyota Corolla')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('a search with no matches says nothing matches the filters, not that the inventory is empty', async () => {
  server.use(
    http.get('/api/vehicles', () => HttpResponse.json([corolla, crv])),
    http.get('/api/vehicles/search', () => HttpResponse.json([])),
  )
  renderDashboard()
  await screen.findByRole('heading', { name: 'Honda CR-V' })
  const user = userEvent.setup()

  await user.type(screen.getByLabelText('Make'), 'zzz')
  await user.click(screen.getByRole('button', { name: 'Search' }))

  expect(await screen.findByText('No vehicles match these filters')).toBeInTheDocument()
  expect(screen.queryByText('No vehicles yet')).not.toBeInTheDocument()
})
