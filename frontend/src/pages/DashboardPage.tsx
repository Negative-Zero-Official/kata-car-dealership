import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  deleteVehicle,
  listVehicles,
  purchaseVehicle,
  searchVehicles,
  type Vehicle,
  type VehicleFilter,
} from '../api/vehicles'
import { useAuth } from '../auth/AuthContext'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FilterBar } from '../components/FilterBar'
import { Toast, type ToastMessage } from '../components/Toast'
import { VehicleCard } from '../components/VehicleCard'
import { VehicleFormModal } from '../components/VehicleFormModal'
import { formatPrice } from '../format'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  // filtered: the vehicles are search results rather than the whole inventory.
  | { status: 'loaded'; vehicles: Vehicle[]; filtered: boolean }

const CARD_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4'

function LoadingCards() {
  return (
    <div role="status">
      <span className="sr-only">Loading vehicles…</span>
      <div aria-hidden="true" className={CARD_GRID}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="panel flex flex-col gap-4 p-5 motion-safe:animate-pulse">
            <div className="flex justify-between">
              <div className="space-y-2">
                <div className="h-3 w-16 rounded bg-line" />
                <div className="h-6 w-28 rounded bg-line" />
              </div>
              <div className="h-7 w-20 rounded bg-line" />
            </div>
            <div className="h-8 w-32 rounded bg-line" />
            <div className="h-10 rounded bg-line" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { isAdmin } = useAuth()
  const [state, setState] = useState<State>({ status: 'loading' })
  // Bumped by Retry to re-run the fetch effect.
  const [attempt, setAttempt] = useState(0)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  // null while closed; { vehicle } edits that vehicle, {} adds a new one.
  const [form, setForm] = useState<{ vehicle?: Vehicle } | null>(null)
  const [deleting, setDeleting] = useState<Vehicle | null>(null)
  const [purchasing, setPurchasing] = useState<Vehicle | null>(null)
  // The filter panel is a sidebar on wide screens and a drawer on narrow ones.
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersToggle = useRef<HTMLButtonElement>(null)
  const filtersPanel = useRef<HTMLElement>(null)

  useEffect(() => {
    let current = true
    listVehicles().then(
      (vehicles) => current && setState({ status: 'loaded', vehicles, filtered: false }),
      () => current && setState({ status: 'error' }),
    )
    return () => {
      current = false
    }
  }, [attempt])

  useEffect(() => {
    if (filtersOpen) {
      filtersPanel.current?.querySelector('input')?.focus()
    }
  }, [filtersOpen])

  const dismissToast = useCallback(() => setToast(null), [])

  function showError(text: string) {
    setToast({ text, kind: 'error' })
  }

  function closeFilters() {
    setFiltersOpen(false)
    filtersToggle.current?.focus()
  }

  function handleFiltersKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (filtersOpen && event.key === 'Escape') {
      closeFilters()
    }
  }

  function retry() {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }

  async function search(filter: VehicleFilter) {
    if (filtersOpen) {
      closeFilters()
    }
    setState({ status: 'loading' })
    try {
      setState({ status: 'loaded', vehicles: await searchVehicles(filter), filtered: true })
    } catch {
      setState({ status: 'error' })
    }
  }

  function clearFilters() {
    if (filtersOpen) {
      closeFilters()
    }
    retry()
  }

  // Replaces the vehicle with the same id, or appends it if it is new.
  function upsertVehicle(saved: Vehicle) {
    setState((current) => {
      if (current.status !== 'loaded') {
        return current
      }
      const exists = current.vehicles.some((v) => v.id === saved.id)
      return {
        ...current,
        vehicles: exists
          ? current.vehicles.map((v) => (v.id === saved.id ? saved : v))
          : [...current.vehicles, saved],
      }
    })
  }

  function handleUpdated(updated: Vehicle) {
    setToast(null)
    upsertVehicle(updated)
  }

  async function confirmPurchase(vehicle: Vehicle) {
    setPurchasing(null)
    try {
      upsertVehicle(await purchaseVehicle(vehicle.id))
      setToast({ text: `Purchased ${vehicle.make} ${vehicle.model}`, kind: 'success' })
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not complete the purchase.')
    }
  }

  function handleSaved(saved: Vehicle) {
    setForm(null)
    upsertVehicle(saved)
  }

  async function confirmDelete(vehicle: Vehicle) {
    setDeleting(null)
    try {
      await deleteVehicle(vehicle.id)
      setState((current) =>
        current.status === 'loaded'
          ? { ...current, vehicles: current.vehicles.filter((v) => v.id !== vehicle.id) }
          : current,
      )
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not delete the vehicle.')
    }
  }

  const drawerClasses = filtersOpen
    ? 'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-[min(22rem,88vw)] max-lg:overflow-y-auto max-lg:rounded-none max-lg:shadow-xl motion-safe:max-lg:animate-[slide-in_180ms_ease-out]'
    : 'max-lg:hidden'

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-4xl font-semibold">Vehicles</h2>
        <div className="flex gap-2">
          <button
            ref={filtersToggle}
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-expanded={filtersOpen}
            aria-controls="vehicle-filters"
            className="btn-secondary lg:hidden"
          >
            Filters
          </button>
          {isAdmin && (
            <button type="button" onClick={() => setForm({})} className="btn-primary">
              Add vehicle
            </button>
          )}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:items-start lg:gap-8">
        {filtersOpen && (
          <div
            aria-hidden="true"
            onClick={closeFilters}
            className="fixed inset-0 z-40 bg-ink/50 lg:hidden"
          />
        )}
        <aside
          id="vehicle-filters"
          ref={filtersPanel}
          aria-labelledby="vehicle-filters-title"
          onKeyDown={handleFiltersKeyDown}
          className={`panel p-5 lg:sticky lg:top-6 ${drawerClasses}`}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 id="vehicle-filters-title" className="font-display text-xl font-semibold">
              Filters
            </h3>
            <button type="button" onClick={closeFilters} className="btn-quiet lg:hidden">
              Close filters
            </button>
          </div>
          <FilterBar onSearch={search} onClear={clearFilters} />
        </aside>

        <section aria-label="Vehicle list" className="mt-6 lg:mt-0">
          {state.status === 'loading' && <LoadingCards />}
          {state.status === 'error' && (
            <div role="alert" className="panel flex flex-wrap items-center gap-4 p-5">
              <p className="flex-1">
                Could not load vehicles. Check that the server is running, then try again.
              </p>
              <button type="button" onClick={retry} className="btn-secondary">
                Retry
              </button>
            </div>
          )}
          {state.status === 'loaded' &&
            (state.vehicles.length === 0 && state.filtered ? (
              <div className="panel border-dashed p-10 text-center">
                <p className="font-display text-2xl font-semibold">
                  No vehicles match these filters
                </p>
                <p className="mt-1 text-muted">Try different filters, or clear them.</p>
              </div>
            ) : state.vehicles.length === 0 ? (
              <div className="panel border-dashed p-10 text-center">
                <p className="font-display text-2xl font-semibold">No vehicles yet</p>
                <p className="mt-1 text-muted">
                  {isAdmin
                    ? 'Add a vehicle to start the inventory.'
                    : 'Clear the filters or check back later.'}
                </p>
              </div>
            ) : (
              <ul className={CARD_GRID}>
                {state.vehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onPurchase={() => setPurchasing(vehicle)}
                    onUpdated={handleUpdated}
                    onError={showError}
                    admin={
                      isAdmin
                        ? {
                            onEdit: () => setForm({ vehicle }),
                            onDelete: () => setDeleting(vehicle),
                          }
                        : undefined
                    }
                  />
                ))}
              </ul>
            ))}
        </section>
      </div>

      {form && (
        <VehicleFormModal
          vehicle={form.vehicle}
          onSaved={handleSaved}
          onCancel={() => setForm(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.make} ${deleting.model}?`}
          description="It disappears from the inventory for everyone. This can't be undone."
          confirmLabel="Delete vehicle"
          onConfirm={() => confirmDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
      {purchasing && (
        <ConfirmDialog
          title={`Buy ${purchasing.make} ${purchasing.model}?`}
          description={`One vehicle for ${formatPrice(purchasing.price)}.`}
          confirmLabel="Confirm purchase"
          tone="primary"
          onConfirm={() => confirmPurchase(purchasing)}
          onCancel={() => setPurchasing(null)}
        />
      )}
      {toast && <Toast message={toast} onDismiss={dismissToast} />}
    </main>
  )
}
