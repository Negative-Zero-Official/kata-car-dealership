import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { login as loginRequest, type Credentials, type User } from '../api/auth'
import { setAuthToken, setUnauthorizedHandler } from '../api/client'

export const SESSION_STORAGE_KEY = 'car-dealership.session'
export const SESSION_EXPIRED_NOTICE = 'Your session expired. Log in again.'

interface Session {
  token: string
  user: User
}

interface AuthContextValue {
  token: string | null
  user: User | null
  isAdmin: boolean
  // Shown on the login page after an expired session signs the user out.
  notice: string | null
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
  const [notice, setNotice] = useState<string | null>(null)

  async function login(credentials: Credentials) {
    const { access_token, user } = await loginRequest(credentials)
    const next = { token: access_token, user }
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next))
    setAuthToken(next.token)
    setSession(next)
    setNotice(null)
  }

  function logout() {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    setAuthToken(null)
    setSession(null)
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      setAuthToken(null)
      setSession(null)
      setNotice(SESSION_EXPIRED_NOTICE)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const value: AuthContextValue = {
    token: session?.token ?? null,
    user: session?.user ?? null,
    isAdmin: session?.user.role === 'admin',
    notice,
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
