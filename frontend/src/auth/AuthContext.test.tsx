import { act, renderHook } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, expect, test } from 'vitest'
import type { Role, User } from '../api/auth'
import { server } from '../mocks/server'
import { AuthProvider, SESSION_STORAGE_KEY, useAuth } from './AuthContext'

const customer: User = { id: 1, email: 'buyer@example.com', role: 'user' }

function respondToLoginWith(user: User, token = 'header.payload.signature') {
  server.use(
    http.post('/api/auth/login', () =>
      HttpResponse.json({ access_token: token, token_type: 'bearer', user }),
    ),
  )
}

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider })
}

afterEach(() => localStorage.clear())

test('login stores the token and user and persists them', async () => {
  respondToLoginWith(customer)
  const { result } = renderAuth()

  await act(() => result.current.login({ email: customer.email, password: 'password123' }))

  expect(result.current.token).toBe('header.payload.signature')
  expect(result.current.user).toEqual(customer)
  expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)!)).toEqual({
    token: 'header.payload.signature',
    user: customer,
  })
})

test('a fresh mount restores the persisted session', () => {
  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({ token: 'restored.token.value', user: customer }),
  )

  const { result } = renderAuth()

  expect(result.current.token).toBe('restored.token.value')
  expect(result.current.user).toEqual(customer)
})

test('logout clears the session and its persisted copy', async () => {
  respondToLoginWith(customer)
  const { result } = renderAuth()
  await act(() => result.current.login({ email: customer.email, password: 'password123' }))

  act(() => result.current.logout())

  expect(result.current.token).toBeNull()
  expect(result.current.user).toBeNull()
  expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
})

test.each<[Role, boolean]>([
  ['admin', true],
  ['user', false],
])('isAdmin for the %s role is %s', async (role, expected) => {
  respondToLoginWith({ ...customer, role })
  const { result } = renderAuth()

  await act(() => result.current.login({ email: customer.email, password: 'password123' }))

  expect(result.current.isAdmin).toBe(expected)
})

test('isAdmin is false when nobody is logged in', () => {
  const { result } = renderAuth()

  expect(result.current.isAdmin).toBe(false)
})
