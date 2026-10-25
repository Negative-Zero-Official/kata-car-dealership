import { useId, useState, type FormEvent } from 'react'
import { restockVehicle, type Vehicle } from '../api/vehicles'

interface RestockControlProps {
  vehicle: Vehicle
  onRestocked: (vehicle: Vehicle) => void
  onError: (message: string) => void
}

export function RestockControl({ vehicle, onRestocked, onError }: RestockControlProps) {
  const inputId = useId()
  const [quantity, setQuantity] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onRestocked(await restockVehicle(vehicle.id, Number(quantity)))
      setQuantity('')
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not restock the vehicle.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="field min-w-0 flex-1">
        <label htmlFor={inputId}>Restock quantity</label>
        <input
          id={inputId}
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="input w-full"
        />
      </div>
      <button type="submit" className="btn-secondary">
        Restock
      </button>
    </form>
  )
}
