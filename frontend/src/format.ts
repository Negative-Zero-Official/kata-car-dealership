import type { Money } from './api/vehicles'

const priceFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// Intl formats the decimal string exactly, so the price never passes through a float.
export function formatPrice(price: Money): string {
  return priceFormat.format(price as Intl.StringNumericLiteral)
}
