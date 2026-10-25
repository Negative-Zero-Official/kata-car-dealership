import { Navigate, Outlet } from 'react-router'
import { useAuth } from './AuthContext'

export function ProtectedRoute() {
  const { token } = useAuth()
  return token ? <Outlet /> : <Navigate to="/login" replace />
}
