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
