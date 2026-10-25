import type { Money, Vehicle } from '../api/vehicles'

const priceFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// Intl formats the decimal string exactly, so the price never passes through a float.
function formatPrice(price: Money): string {
  return priceFormat.format(price as Intl.StringNumericLiteral)
}

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  return (
    <li className="rounded border p-4">
      <h3 className="text-lg font-semibold">
        {vehicle.make} {vehicle.model}
      </h3>
      <p className="text-sm text-gray-600">{vehicle.category}</p>
      <p className="mt-2 font-medium">{formatPrice(vehicle.price)}</p>
      <p className="text-sm">{vehicle.quantity} in stock</p>
    </li>
  )
}
