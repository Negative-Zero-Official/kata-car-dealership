import { useEffect, useState } from 'react'
import { listVehicles, searchVehicles, type Vehicle, type VehicleFilter } from '../api/vehicles'
import { useAuth } from '../auth/AuthContext'
import { FilterBar } from '../components/FilterBar'
import { VehicleCard } from '../components/VehicleCard'
import { VehicleFormModal } from '../components/VehicleFormModal'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; vehicles: Vehicle[] }

export function DashboardPage() {
  const { isAdmin } = useAuth()
  const [state, setState] = useState<State>({ status: 'loading' })
  // Bumped by Retry to re-run the fetch effect.
  const [attempt, setAttempt] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  // null while closed; { vehicle } edits that vehicle, {} adds a new one.
  const [form, setForm] = useState<{ vehicle?: Vehicle } | null>(null)

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

  async function search(filter: VehicleFilter) {
    setState({ status: 'loading' })
    try {
      setState({ status: 'loaded', vehicles: await searchVehicles(filter) })
    } catch {
      setState({ status: 'error' })
    }
  }

  // Replaces the vehicle with the same id, or appends it if it is new.
  function upsertVehicle(saved: Vehicle) {
    setState((current) => {
      if (current.status !== 'loaded') {
        return current
      }
      const exists = current.vehicles.some((v) => v.id === saved.id)
      return {
        status: 'loaded',
        vehicles: exists
          ? current.vehicles.map((v) => (v.id === saved.id ? saved : v))
          : [...current.vehicles, saved],
      }
    })
  }

  function handlePurchased(updated: Vehicle) {
    setToast(null)
    upsertVehicle(updated)
  }

  function handleSaved(saved: Vehicle) {
    setForm(null)
    upsertVehicle(saved)
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Vehicles</h2>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setForm({})}
            className="rounded bg-blue-700 px-4 py-2 text-white"
          >
            Add vehicle
          </button>
        )}
      </div>
      <FilterBar onSearch={search} onClear={retry} />
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
                onPurchased={handlePurchased}
                onPurchaseError={setToast}
                onEdit={isAdmin ? () => setForm({ vehicle }) : undefined}
              />
            ))}
          </ul>
        ))}
      {form && (
        <VehicleFormModal
          vehicle={form.vehicle}
          onSaved={handleSaved}
          onCancel={() => setForm(null)}
        />
      )}
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
