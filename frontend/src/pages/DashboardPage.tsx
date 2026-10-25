import { useEffect, useState } from 'react'
import { listVehicles, type Vehicle } from '../api/vehicles'
import { VehicleCard } from '../components/VehicleCard'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; vehicles: Vehicle[] }

export function DashboardPage() {
  const [state, setState] = useState<State>({ status: 'loading' })
  // Bumped by Retry to re-run the fetch effect.
  const [attempt, setAttempt] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    listVehicles().then(
      (vehicles) => current && setState({ status: 'loaded', vehicles }),
      () => current && setState({ status: 'error' }),
    )
    return () => {
      current = false
    }
  }, [attempt])

  function retry() {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }

  function replaceVehicle(updated: Vehicle) {
    setToast(null)
    setState((current) =>
      current.status === 'loaded'
        ? {
            status: 'loaded',
            vehicles: current.vehicles.map((v) => (v.id === updated.id ? updated : v)),
          }
        : current,
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h2 className="mb-6 text-2xl font-semibold">Vehicles</h2>
      {state.status === 'loading' && <p role="status">Loading vehicles…</p>}
      {state.status === 'error' && (
        <div role="alert" className="flex items-center gap-4">
          <p>Could not load vehicles.</p>
          <button type="button" onClick={retry} className="rounded border px-3 py-1">
            Retry
          </button>
        </div>
      )}
      {state.status === 'loaded' &&
        (state.vehicles.length === 0 ? (
          <p>No vehicles yet</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {state.vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onPurchased={replaceVehicle}
                onPurchaseError={setToast}
              />
            ))}
          </ul>
        ))}
      {toast && (
        <p
          role="alert"
          className="fixed right-4 bottom-4 rounded bg-red-700 px-4 py-3 text-white shadow"
        >
          {toast}
        </p>
      )}
    </main>
  )
}
