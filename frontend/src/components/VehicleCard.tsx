import type { Money, Vehicle } from '../api/vehicles'
import { PurchaseButton } from './PurchaseButton'
import { RestockControl } from './RestockControl'

const priceFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// Intl formats the decimal string exactly, so the price never passes through a float.
function formatPrice(price: Money): string {
  return priceFormat.format(price as Intl.StringNumericLiteral)
}

interface AdminActions {
  onEdit: () => void
  onDelete: () => void
}

interface VehicleCardProps {
  vehicle: Vehicle
  // Called with the vehicle the API returns after a purchase or restock.
  onUpdated: (vehicle: Vehicle) => void
  onError: (message: string) => void
  // Only passed for admins.
  admin?: AdminActions
}

export function VehicleCard({ vehicle, onUpdated, onError, admin }: VehicleCardProps) {
  return (
    <li className="rounded border p-4">
      <h3 className="text-lg font-semibold">
        {vehicle.make} {vehicle.model}
      </h3>
      <p className="text-sm text-gray-600">{vehicle.category}</p>
      <p className="mt-2 font-medium">{formatPrice(vehicle.price)}</p>
      <p className="text-sm">{vehicle.quantity} in stock</p>
      <div className="flex flex-wrap gap-2">
        <PurchaseButton vehicle={vehicle} onPurchased={onUpdated} onError={onError} />
        {admin && (
          <>
            <button type="button" onClick={admin.onEdit} className="mt-3 rounded border px-4 py-2">
              Edit
            </button>
            <button
              type="button"
              onClick={admin.onDelete}
              className="mt-3 rounded border border-red-700 px-4 py-2 text-red-700"
            >
              Delete
            </button>
          </>
        )}
      </div>
      {admin && <RestockControl vehicle={vehicle} onRestocked={onUpdated} onError={onError} />}
    </li>
  )
}
