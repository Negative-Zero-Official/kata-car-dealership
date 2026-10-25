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

// Laid out like a dealer's window sticker: model and price up top, a hang tag for
// stock, and the admin tools below a perforated tear-off line.
export function VehicleCard({ vehicle, onUpdated, onError, admin }: VehicleCardProps) {
  const soldOut = vehicle.quantity === 0
  const tagColours = soldOut ? 'bg-sold text-white' : 'bg-tag text-ink'

  return (
    <li className="panel flex flex-col">
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0">
            <span className="block text-sm font-medium text-muted">{vehicle.make}</span>{' '}
            <span className="block truncate font-display text-2xl leading-tight font-semibold">
              {vehicle.model}
            </span>
          </h3>
          <p className={`hang-tag shrink-0 ${tagColours}`}>{vehicle.quantity} in stock</p>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3">
          <p className="font-display text-3xl font-semibold tabular-nums">
            {formatPrice(vehicle.price)}
          </p>
          <p className="rounded-full border border-line px-2.5 py-0.5 text-sm text-muted">
            {vehicle.category}
          </p>
        </div>
        <PurchaseButton vehicle={vehicle} onPurchased={onUpdated} onError={onError} />
      </div>
      {admin && (
        <div className="flex flex-col gap-3 border-t-2 border-dashed border-line p-5">
          <RestockControl vehicle={vehicle} onRestocked={onUpdated} onError={onError} />
          <div className="flex justify-end gap-1">
            <button type="button" onClick={admin.onEdit} className="btn-quiet">
              Edit
            </button>
            <button
              type="button"
              onClick={admin.onDelete}
              className="btn-quiet text-sold hover:bg-sold/10"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
