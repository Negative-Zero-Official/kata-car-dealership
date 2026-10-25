import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, expect, test } from 'vitest'
import type { User } from '../api/auth'
import { AuthProvider, SESSION_STORAGE_KEY } from '../auth/AuthContext'
import { server } from '../mocks/server'
import { RegisterPage } from './RegisterPage'

const newCustomer: User = { id: 7, email: 'new@example.com', role: 'user' }

function renderRegisterPage() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<p>Home page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Create account' }))
}

afterEach(() => localStorage.clear())

test('a successful registration signs the user in and navigates home', async () => {
  const requests: Array<{ path: string; body: unknown }> = []
  server.use(
    http.post('/api/auth/register', async ({ request }) => {
      requests.push({ path: '/api/auth/register', body: await request.json() })
      return HttpResponse.json(newCustomer, { status: 201 })
    }),
    http.post('/api/auth/login', async ({ request }) => {
      requests.push({ path: '/api/auth/login', body: await request.json() })
      return HttpResponse.json({ access_token: 'a.b.c', token_type: 'bearer', user: newCustomer })
    }),
  )
  renderRegisterPage()

  await fillAndSubmit('new@example.com', 'password123')

  expect(await screen.findByText('Home page')).toBeInTheDocument()
  const credentials = { email: 'new@example.com', password: 'password123' }
  expect(requests).toEqual([
    { path: '/api/auth/register', body: credentials },
    { path: '/api/auth/login', body: credentials },
  ])
  expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)!)).toEqual({
    token: 'a.b.c',
    user: newCustomer,
  })
})

test('a 409 shows "Email already registered"', async () => {
  server.use(
    http.post('/api/auth/register', () =>
      HttpResponse.json({ detail: 'Email already registered' }, { status: 409 }),
    ),
  )
  renderRegisterPage()

  await fillAndSubmit('taken@example.com', 'password123')

  expect(await screen.findByRole('alert')).toHaveTextContent('Email already registered')
  expect(screen.queryByText('Home page')).not.toBeInTheDocument()
})

test('a password under 8 characters shows an inline error and sends no request', async () => {
  let requested = false
  server.use(
    http.post('/api/auth/register', () => {
      requested = true
      return HttpResponse.json(newCustomer, { status: 201 })
    }),
  )
  renderRegisterPage()

  await fillAndSubmit('new@example.com', 'short12')

  expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
    'Password must be at least 8 characters',
  )
  expect(requested).toBe(false)
})
