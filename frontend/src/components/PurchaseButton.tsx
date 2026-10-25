import type { Vehicle } from '../api/vehicles'

interface PurchaseButtonProps {
  vehicle: Vehicle
  // Asks for confirmation; the purchase itself happens once the buyer confirms.
  onPurchase: () => void
}

export function PurchaseButton({ vehicle, onPurchase }: PurchaseButtonProps) {
  const soldOut = vehicle.quantity === 0

  return (
    <button type="button" disabled={soldOut} onClick={onPurchase} className="btn-primary w-full">
      {soldOut ? 'Sold out' : 'Purchase'}
    </button>
  )
}
