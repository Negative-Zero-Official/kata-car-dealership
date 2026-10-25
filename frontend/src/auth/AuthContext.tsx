import { createContext, useContext, useState, type ReactNode } from 'react'
import { login as loginRequest, type Credentials, type User } from '../api/auth'
import { setAuthToken } from '../api/client'

export const SESSION_STORAGE_KEY = 'car-dealership.session'

interface Session {
  token: string
  user: User
}

interface AuthContextValue {
  token: string | null
  user: User | null
  isAdmin: boolean
  login: (credentials: Credentials) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Runs during the first render, so the API client has the token before any child effect fetches.
function restoreSession(): Session | null {
  const stored = localStorage.getItem(SESSION_STORAGE_KEY)
  const session: Session | null = stored ? JSON.parse(stored) : null
  setAuthToken(session?.token ?? null)
  return session
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(restoreSession)

  async function login(credentials: Credentials) {
    const { access_token, user } = await loginRequest(credentials)
    const next = { token: access_token, user }
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next))
    setAuthToken(next.token)
    setSession(next)
  }

  function logout() {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    setAuthToken(null)
    setSession(null)
  }

  const value: AuthContextValue = {
    token: session?.token ?? null,
    user: session?.user ?? null,
    isAdmin: session?.user.role === 'admin',
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return value
}
