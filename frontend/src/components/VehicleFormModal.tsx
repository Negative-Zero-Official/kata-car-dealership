import { useState, type FormEvent } from 'react'
import { createVehicle, updateVehicle, type Vehicle } from '../api/vehicles'
import { Modal } from './Modal'

interface VehicleFormModalProps {
  // Given a vehicle the form edits its details; without one it adds a new vehicle.
  vehicle?: Vehicle
  onSaved: (vehicle: Vehicle) => void
  onCancel: () => void
}

type FieldName = 'make' | 'model' | 'category' | 'price' | 'quantity'
type Fields = Record<FieldName, string>
type Errors = Partial<Record<FieldName, string>>

function initialFields(vehicle?: Vehicle): Fields {
  return {
    make: vehicle?.make ?? '',
    model: vehicle?.model ?? '',
    category: vehicle?.category ?? '',
    price: vehicle?.price ?? '',
    quantity: vehicle ? String(vehicle.quantity) : '',
  }
}

// Checked on the string itself (up to 2 decimal places, at least one non-zero digit), never as a float.
function isPositivePrice(value: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(value) && /[1-9]/.test(value)
}

// Quantity is only checked when adding: editing changes details, and stock moves via purchase/restock.
function validate(fields: Fields, withQuantity: boolean): Errors {
  const errors: Errors = {}
  if (!fields.make.trim()) errors.make = 'Enter a make'
  if (!fields.model.trim()) errors.model = 'Enter a model'
  if (!fields.category.trim()) errors.category = 'Enter a category'
  if (!isPositivePrice(fields.price)) errors.price = 'Enter a price above 0'
  if (withQuantity && !/^\d+$/.test(fields.quantity)) {
    errors.quantity = 'Enter a whole number of 0 or more'
  }
  return errors
}

export function VehicleFormModal({ vehicle, onSaved, onCancel }: VehicleFormModalProps) {
  const editing = vehicle !== undefined
  const title = editing ? 'Edit vehicle' : 'Add vehicle'
  const [fields, setFields] = useState(() => initialFields(vehicle))
  const [errors, setErrors] = useState<Errors>({})
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate(fields, !editing)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      return
    }
    const details = {
      make: fields.make.trim(),
      model: fields.model.trim(),
      category: fields.category.trim(),
      price: fields.price,
    }
    try {
      onSaved(
        vehicle
          ? await updateVehicle(vehicle.id, details)
          : await createVehicle({ ...details, quantity: Number(fields.quantity) }),
      )
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save the vehicle. Try again.')
    }
  }

  function field(name: FieldName, label: string, numeric?: { step: string }) {
    const errorId = `vehicle-${name}-error`
    return (
      <div className="flex flex-col gap-1">
        <label className="field">
          {label}
          <input
            type={numeric ? 'number' : 'text'}
            step={numeric?.step}
            min={numeric ? '0' : undefined}
            inputMode={numeric ? (numeric.step === '1' ? 'numeric' : 'decimal') : undefined}
            value={fields[name]}
            onChange={(e) => setFields({ ...fields, [name]: e.target.value })}
            aria-invalid={errors[name] !== undefined}
            aria-describedby={errors[name] ? errorId : undefined}
            className="input"
          />
        </label>
        {errors[name] && (
          <span id={errorId} className="field-error">
            {errors[name]}
          </span>
        )}
      </div>
    )
  }

  return (
    <Modal labelledBy="vehicle-form-title" onClose={onCancel}>
      <h3 id="vehicle-form-title" className="font-display text-2xl font-semibold">
        {title}
      </h3>
      {editing && (
        <p className="mt-1 text-sm text-muted">Change stock with Restock on the card.</p>
      )}
      <form
        aria-label={title}
        noValidate
        onSubmit={handleSubmit}
        className="mt-5 flex flex-col gap-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {field('make', 'Make')}
          {field('model', 'Model')}
        </div>
        {field('category', 'Category')}
        <div className="grid gap-4 sm:grid-cols-2">
          {field('price', 'Price', { step: '0.01' })}
          {!editing && field('quantity', 'Quantity', { step: '1' })}
        </div>
        {saveError && (
          <p role="alert" className="field-error">
            {saveError}
          </p>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save vehicle
          </button>
        </div>
      </form>
    </Modal>
  )
}
