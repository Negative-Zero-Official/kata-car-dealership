import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, expect, test } from 'vitest'
import type { User } from '../api/auth'
import { AuthProvider } from '../auth/AuthContext'
import { server } from '../mocks/server'
import { LoginPage } from './LoginPage'

const customer: User = { id: 1, email: 'buyer@example.com', role: 'user' }

function renderLoginPage() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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
  await user.click(screen.getByRole('button', { name: 'Log in' }))
}

afterEach(() => localStorage.clear())

test('has labelled email and password fields', () => {
  renderLoginPage()

  expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
})

test('a valid submit logs in and navigates home', async () => {
  let body: unknown
  server.use(
    http.post('/api/auth/login', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ access_token: 'a.b.c', token_type: 'bearer', user: customer })
    }),
  )
  renderLoginPage()

  await fillAndSubmit('buyer@example.com', 'password123')

  expect(await screen.findByText('Home page')).toBeInTheDocument()
  expect(body).toEqual({ email: 'buyer@example.com', password: 'password123' })
})

test('a 401 shows "Invalid email or password"', async () => {
  server.use(
    http.post('/api/auth/login', () =>
      HttpResponse.json({ detail: 'Invalid email or password' }, { status: 401 }),
    ),
  )
  renderLoginPage()

  await fillAndSubmit('buyer@example.com', 'wrong-password')

  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  expect(screen.queryByText('Home page')).not.toBeInTheDocument()
})

test('the button is disabled while submitting', async () => {
  let respond!: () => void
  const responded = new Promise<void>((resolve) => (respond = resolve))
  server.use(
    http.post('/api/auth/login', async () => {
      await responded
      return HttpResponse.json({ access_token: 'a.b.c', token_type: 'bearer', user: customer })
    }),
  )
  renderLoginPage()

  await fillAndSubmit('buyer@example.com', 'password123')

  expect(screen.getByRole('button', { name: /log/i })).toBeDisabled()
  respond()
  expect(await screen.findByText('Home page')).toBeInTheDocument()
})
