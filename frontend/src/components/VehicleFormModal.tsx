import { useState, type FormEvent } from 'react'
import { createVehicle, type Vehicle } from '../api/vehicles'

interface VehicleFormModalProps {
  onSaved: (vehicle: Vehicle) => void
  onCancel: () => void
}

type FieldName = 'make' | 'model' | 'category' | 'price' | 'quantity'
type Errors = Partial<Record<FieldName, string>>

const EMPTY: Record<FieldName, string> = {
  make: '',
  model: '',
  category: '',
  price: '',
  quantity: '',
}

// Checked on the string itself (up to 2 decimal places, at least one non-zero digit), never as a float.
function isPositivePrice(value: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(value) && /[1-9]/.test(value)
}

function validate(fields: Record<FieldName, string>): Errors {
  const errors: Errors = {}
  if (!fields.make.trim()) errors.make = 'Enter a make'
  if (!fields.model.trim()) errors.model = 'Enter a model'
  if (!fields.category.trim()) errors.category = 'Enter a category'
  if (!isPositivePrice(fields.price)) errors.price = 'Enter a price above 0'
  if (!/^\d+$/.test(fields.quantity)) errors.quantity = 'Enter a whole number of 0 or more'
  return errors
}

export function VehicleFormModal({ onSaved, onCancel }: VehicleFormModalProps) {
  const [fields, setFields] = useState(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate(fields)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      return
    }
    try {
      onSaved(
        await createVehicle({
          make: fields.make.trim(),
          model: fields.model.trim(),
          category: fields.category.trim(),
          price: fields.price,
          quantity: Number(fields.quantity),
        }),
      )
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save the vehicle. Try again.')
    }
  }

  function field(name: FieldName, label: string, numeric?: { step: string }) {
    const errorId = `vehicle-${name}-error`
    return (
      <div className="flex flex-col gap-1 text-sm">
        <label className="flex flex-col gap-1">
          {label}
          <input
            type={numeric ? 'number' : 'text'}
            step={numeric?.step}
            value={fields[name]}
            onChange={(e) => setFields({ ...fields, [name]: e.target.value })}
            aria-invalid={errors[name] !== undefined}
            aria-describedby={errors[name] ? errorId : undefined}
            className="rounded border px-3 py-2"
          />
        </label>
        {errors[name] && (
          <span id={errorId} className="text-red-700">
            {errors[name]}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vehicle-form-title"
        className="w-full max-w-md rounded bg-white p-6"
      >
        <h3 id="vehicle-form-title" className="mb-4 text-lg font-semibold">
          Add vehicle
        </h3>
        <form
          aria-label="Add vehicle"
          noValidate
          onSubmit={handleSubmit}
          className="flex flex-col gap-3"
        >
          {field('make', 'Make')}
          {field('model', 'Model')}
          {field('category', 'Category')}
          {field('price', 'Price', { step: '0.01' })}
          {field('quantity', 'Quantity', { step: '1' })}
          {saveError && (
            <p role="alert" className="text-red-700">
              {saveError}
            </p>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="rounded border px-4 py-2">
              Cancel
            </button>
            <button type="submit" className="rounded bg-blue-700 px-4 py-2 text-white">
              Save vehicle
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
