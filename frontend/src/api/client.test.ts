import { http, HttpResponse } from 'msw'
import { afterEach, expect, test } from 'vitest'
import { server } from '../mocks/server'
import { ApiError, apiRequest, setAuthToken } from './client'

afterEach(() => setAuthToken(null))

test('sends a bearer token when one is set', async () => {
  let authorization: string | null = null
  server.use(
    http.get('/api/vehicles', ({ request }) => {
      authorization = request.headers.get('Authorization')
      return HttpResponse.json([])
    }),
  )
  setAuthToken('abc.def.ghi')

  await apiRequest('/api/vehicles')

  expect(authorization).toBe('Bearer abc.def.ghi')
})

test('sends no authorization header when no token is set', async () => {
  let authorization: string | null = 'unset'
  server.use(
    http.get('/api/vehicles', ({ request }) => {
      authorization = request.headers.get('Authorization')
      return HttpResponse.json([])
    }),
  )

  await apiRequest('/api/vehicles')

  expect(authorization).toBeNull()
})

test('throws an ApiError with the status and detail of a non-2xx response', async () => {
  server.use(
    http.post('/api/vehicles/1/purchase', () =>
      HttpResponse.json({ detail: 'Vehicle is out of stock' }, { status: 409 }),
    ),
  )

  const error = await apiRequest('/api/vehicles/1/purchase', { method: 'POST' }).catch(
    (e: unknown) => e,
  )

  expect(error).toBeInstanceOf(ApiError)
  expect(error).toMatchObject({ status: 409, detail: 'Vehicle is out of stock' })
})

test('resolves to undefined for a 204 response', async () => {
  server.use(http.delete('/api/vehicles/1', () => new HttpResponse(null, { status: 204 })))

  await expect(apiRequest('/api/vehicles/1', { method: 'DELETE' })).resolves.toBeUndefined()
})

test('a 422 validation error is thrown with the first validation message', async () => {
  server.use(
    http.post('/api/vehicles/1/restock', () =>
      HttpResponse.json(
        {
          detail: [
            {
              type: 'greater_than',
              loc: ['body', 'quantity'],
              msg: 'Input should be greater than 0',
              input: 0,
            },
          ],
        },
        { status: 422 },
      ),
    ),
  )

  const error = await apiRequest('/api/vehicles/1/restock', { method: 'POST' }).catch(
    (e: unknown) => e,
  )

  expect(error).toBeInstanceOf(ApiError)
  expect(error).toMatchObject({ status: 422, message: 'Input should be greater than 0' })
})
