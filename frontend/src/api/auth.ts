import { apiRequest, jsonBody } from './client'

export type Role = 'admin' | 'user'

export interface User {
  id: number
  email: string
  role: Role
}

export interface Credentials {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: 'bearer'
  user: User
}

export function register(credentials: Credentials): Promise<User> {
  return apiRequest('/api/auth/register', { method: 'POST', ...jsonBody(credentials) })
}

export function login(credentials: Credentials): Promise<TokenResponse> {
  return apiRequest('/api/auth/login', { method: 'POST', ...jsonBody(credentials) })
}
