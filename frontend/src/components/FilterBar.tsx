import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { Money, VehicleFilter } from '../api/vehicles'

interface FilterBarProps {
  onSearch: (filter: VehicleFilter) => void
  onClear: () => void
}

const EMPTY = { make: '', model: '', category: '', min_price: '', max_price: '' }

// Compares two non-negative decimal strings digit by digit, so prices never become floats.
function isGreater(a: Money, b: Money): boolean {
  const [aInt, aFrac = ''] = a.split('.')
  const [bInt, bFrac = ''] = b.split('.')
  const width = Math.max(aFrac.length, bFrac.length)
  const left = aInt.replace(/^0+/, '')
  const right = bInt.replace(/^0+/, '')
  if (left.length !== right.length) {
    return left.length > right.length
  }
  return left + aFrac.padEnd(width, '0') > right + bFrac.padEnd(width, '0')
}

export function FilterBar({ onSearch, onClear }: FilterBarProps) {
  const [fields, setFields] = useState(EMPTY)
  const [priceError, setPriceError] = useState<string | null>(null)

  function field(name: keyof typeof EMPTY) {
    return {
      value: fields[name],
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        setFields({ ...fields, [name]: e.target.value }),
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (fields.min_price && fields.max_price && isGreater(fields.min_price, fields.max_price)) {
      setPriceError('Max price must be at least the min price')
      return
    }
    setPriceError(null)
    const filter = Object.fromEntries(Object.entries(fields).filter(([, value]) => value.trim()))
    onSearch(filter)
  }

  function handleClear() {
    setFields(EMPTY)
    setPriceError(null)
    onClear()
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="field">
        Make
        <input {...field('make')} className="input" />
      </label>
      <label className="field">
        Model
        <input {...field('model')} className="input" />
      </label>
      <label className="field">
        Category
        <input {...field('category')} className="input" />
      </label>
      <fieldset className="flex flex-col gap-1">
        <legend className="sr-only">Price range</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            Min price
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              {...field('min_price')}
              className="input w-full"
            />
          </label>
          <label className="field">
            Max price
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              {...field('max_price')}
              aria-invalid={priceError !== null}
              aria-describedby={priceError ? 'max-price-error' : undefined}
              className="input w-full"
            />
          </label>
        </div>
        {priceError && (
          <p id="max-price-error" className="field-error">
            {priceError}
          </p>
        )}
      </fieldset>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1">
          Search
        </button>
        <button type="button" onClick={handleClear} className="btn-secondary">
          Clear
        </button>
      </div>
    </form>
  )
}
