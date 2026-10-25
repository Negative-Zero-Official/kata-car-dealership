import { apiRequest, jsonBody } from './client'

// Money travels as a two-decimal string (e.g. "25000.00"), never a float.
export type Money = string

export interface VehicleDetails {
  make: string
  model: string
  category: string
  price: Money
}

export interface VehicleInput extends VehicleDetails {
  quantity: number
}

export interface Vehicle extends VehicleInput {
  id: number
}

export interface VehicleFilter {
  make?: string
  model?: string
  category?: string
  min_price?: Money
  max_price?: Money
}

export function listVehicles(): Promise<Vehicle[]> {
  return apiRequest('/api/vehicles')
}

export function searchVehicles(filter: VehicleFilter): Promise<Vehicle[]> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filter)) {
    if (value) {
      params.set(key, value)
    }
  }
  return apiRequest(`/api/vehicles/search?${params}`)
}

export function createVehicle(vehicle: VehicleInput): Promise<Vehicle> {
  return apiRequest('/api/vehicles', { method: 'POST', ...jsonBody(vehicle) })
}

export function updateVehicle(id: number, details: VehicleDetails): Promise<Vehicle> {
  return apiRequest(`/api/vehicles/${id}`, { method: 'PUT', ...jsonBody(details) })
}

export function deleteVehicle(id: number): Promise<void> {
  return apiRequest(`/api/vehicles/${id}`, { method: 'DELETE' })
}

export function purchaseVehicle(id: number, quantity = 1): Promise<Vehicle> {
  return apiRequest(`/api/vehicles/${id}/purchase`, { method: 'POST', ...jsonBody({ quantity }) })
}

export function restockVehicle(id: number, quantity: number): Promise<Vehicle> {
  return apiRequest(`/api/vehicles/${id}/restock`, { method: 'POST', ...jsonBody({ quantity }) })
}
