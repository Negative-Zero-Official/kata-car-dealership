import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
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
    <main className="mx-auto max-w-sm px-4 py-12 sm:py-20">
      <div className="panel p-6 sm:p-8">
        <h2 className="font-display text-3xl font-semibold">Create an account</h2>
        <p className="mt-1 text-muted">You'll be signed in as soon as it's created.</p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="field">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </label>
          <div className="flex flex-col gap-1">
            <label className="field">
              Password
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={passwordError !== null}
                aria-describedby={passwordError ? 'password-error' : undefined}
                className="input"
              />
            </label>
            {passwordError && (
              <p id="password-error" className="field-error">
                {passwordError}
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary mt-2">
            Create account
          </button>
        </form>
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-showroom underline-offset-2 hover:underline">
          Log in
        </Link>
      </p>
    </main>
  )
}
