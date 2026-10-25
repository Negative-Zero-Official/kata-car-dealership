import { purchaseVehicle, type Vehicle } from '../api/vehicles'

interface PurchaseButtonProps {
  vehicle: Vehicle
  onPurchased: (vehicle: Vehicle) => void
  onError: (message: string) => void
}

export function PurchaseButton({ vehicle, onPurchased, onError }: PurchaseButtonProps) {
  const soldOut = vehicle.quantity === 0

  async function purchase() {
    try {
      onPurchased(await purchaseVehicle(vehicle.id))
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not complete the purchase.')
    }
  }

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={purchase}
      className="mt-3 rounded bg-blue-700 px-4 py-2 text-white disabled:bg-gray-400"
    >
      {soldOut ? 'Sold out' : 'Purchase'}
    </button>
  )
}
