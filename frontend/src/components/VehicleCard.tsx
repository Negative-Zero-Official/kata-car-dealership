import type { Money, Vehicle } from '../api/vehicles'
import { PurchaseButton } from './PurchaseButton'

const priceFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// Intl formats the decimal string exactly, so the price never passes through a float.
function formatPrice(price: Money): string {
  return priceFormat.format(price as Intl.StringNumericLiteral)
}

interface VehicleCardProps {
  vehicle: Vehicle
  onPurchased: (vehicle: Vehicle) => void
  onPurchaseError: (message: string) => void
}

export function VehicleCard({ vehicle, onPurchased, onPurchaseError }: VehicleCardProps) {
  return (
    <li className="rounded border p-4">
      <h3 className="text-lg font-semibold">
        {vehicle.make} {vehicle.model}
      </h3>
      <p className="text-sm text-gray-600">{vehicle.category}</p>
      <p className="mt-2 font-medium">{formatPrice(vehicle.price)}</p>
      <p className="text-sm">{vehicle.quantity} in stock</p>
      <PurchaseButton vehicle={vehicle} onPurchased={onPurchased} onError={onPurchaseError} />
    </li>
  )
}
