import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { login, notice } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login({ email, password })
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log in. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12 sm:py-20">
      <div className="panel p-6 sm:p-8">
        <h2 className="font-display text-3xl font-semibold">Log in</h2>
        <p className="mt-1 text-muted">Log in to browse and buy vehicles.</p>
        {notice && (
          <p role="status" className="mt-5 rounded border-l-4 border-tag bg-tag/15 px-3 py-2">
            {notice}
          </p>
        )}
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
          <label className="field">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </label>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className="btn-primary mt-2">
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        New here?{' '}
        <Link to="/register" className="font-semibold text-showroom underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </main>
  )
}
