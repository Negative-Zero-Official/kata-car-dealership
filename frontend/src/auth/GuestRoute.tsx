import { Navigate, Outlet } from 'react-router'
import { useAuth } from './AuthContext'

// For pages only signed-out visitors need, such as login and register.
export function GuestRoute() {
  const { token } = useAuth()
  return token ? <Navigate to="/" replace /> : <Outlet />
}
