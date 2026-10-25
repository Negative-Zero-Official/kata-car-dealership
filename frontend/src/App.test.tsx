import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, test } from 'vitest'
import App from './App'
import { SESSION_STORAGE_KEY } from './auth/AuthContext'
import { server } from './mocks/server'

afterEach(() => localStorage.clear())

test('renders the home page', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: 'Car Dealership' })).toBeInTheDocument()
})

test('visiting / while signed out redirects to /login', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
})

test('a 401 from the API logs out and returns to /login with "Your session expired"', async () => {
  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({ token: 'expired.token', user: { id: 1, email: 'a@b.com', role: 'user' } }),
  )
  server.use(
    http.get('/api/vehicles', () =>
      HttpResponse.json({ detail: 'Invalid or expired token' }, { status: 401 }),
    ),
  )
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  expect(screen.getByText(/Your session expired/)).toBeInTheDocument()
  expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
})

test('a wrong password on /login is not treated as an expired session', async () => {
  server.use(
    http.post('/api/auth/login', () =>
      HttpResponse.json({ detail: 'Invalid email or password' }, { status: 401 }),
    ),
  )
  render(
    <MemoryRouter initialEntries={['/login']}>
      <App />
    </MemoryRouter>,
  )
  const user = userEvent.setup()

  await user.type(screen.getByLabelText('Email'), 'a@b.com')
  await user.type(screen.getByLabelText('Password'), 'wrong-password')
  await user.click(screen.getByRole('button', { name: 'Log in' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  expect(screen.queryByText(/Your session expired/)).not.toBeInTheDocument()
})

test('a signed-in user can log out, which clears the session and returns to /login', async () => {
  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({ token: 'a.b.c', user: { id: 1, email: 'buyer@example.com', role: 'user' } }),
  )
  server.use(http.get('/api/vehicles', () => HttpResponse.json([])))
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )
  await screen.findByText('No vehicles yet')

  await userEvent.setup().click(screen.getByRole('button', { name: 'Log out' }))

  expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument()
  expect(screen.queryByText(/Your session expired/)).not.toBeInTheDocument()
})

test('Log out is not shown while signed out', () => {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <App />
    </MemoryRouter>,
  )

  expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument()
})

test.each(['/login', '/register'])('visiting %s while signed in goes to the dashboard', async (path) => {
  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({ token: 'a.b.c', user: { id: 1, email: 'buyer@example.com', role: 'user' } }),
  )
  server.use(http.get('/api/vehicles', () => HttpResponse.json([])))
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: 'Vehicles' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: /Log in|Create an account/ })).not.toBeInTheDocument()
})

test('an unknown path shows a not-found page with a link home', async () => {
  render(
    <MemoryRouter initialEntries={['/no-such-page']}>
      <App />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Go to the dashboard' })).toHaveAttribute('href', '/')
})
