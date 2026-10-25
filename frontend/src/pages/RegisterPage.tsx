import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { register } from '../api/auth'
import { useAuth } from '../auth/AuthContext'

// Matches the backend's RegisterRequest.password min_length.
const PASSWORD_MIN_LENGTH = 8

export function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (password.length < PASSWORD_MIN_LENGTH) {
      setPasswordError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
      return
    }
    setPasswordError(null)
    try {
      await register({ email, password })
      await login({ email, password })
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the account. Try again.')
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Create an account</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Password
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={passwordError !== null}
            aria-describedby={passwordError ? 'password-error' : undefined}
            className="rounded border px-3 py-2"
          />
        </label>
        {passwordError && (
          <p id="password-error" className="text-sm text-red-700">
            {passwordError}
          </p>
        )}
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        <button type="submit" className="rounded bg-blue-700 px-4 py-2 text-white">
          Create account
        </button>
      </form>
    </main>
  )
}
