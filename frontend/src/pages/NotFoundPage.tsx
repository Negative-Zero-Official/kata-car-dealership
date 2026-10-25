import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-12 sm:py-20">
      <div className="panel p-6 sm:p-8">
        <h2 className="font-display text-3xl font-semibold">Page not found</h2>
        <p className="mt-1 text-muted">There is nothing at this address.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex">
          Go to the dashboard
        </Link>
      </div>
    </main>
  )
}
