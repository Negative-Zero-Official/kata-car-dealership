let authToken: string | null = null
let onUnauthorized: (() => void) | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
}

// Called when a request that carried a token gets a 401, i.e. the session has expired.
// A 401 without a token (a wrong password at login) is left to the caller.
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

// FastAPI sends a string detail for HTTPException and a list of { msg, ... } for a 422.
function detailMessage(detail: unknown): string | undefined {
  if (typeof detail === 'string') {
    return detail
  }
  if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') {
    return detail[0].msg
  }
  return undefined
}

export class ApiError extends Error {
  readonly status: number
  readonly detail: unknown

  constructor(status: number, detail: unknown) {
    super(detailMessage(detail) ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export function jsonBody(body: unknown): RequestInit {
  return { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = authToken
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(path, { ...init, headers })

  if (!response.ok) {
    if (response.status === 401 && token) {
      onUnauthorized?.()
    }
    const { detail } = await response.json()
    throw new ApiError(response.status, detail)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json()
}
