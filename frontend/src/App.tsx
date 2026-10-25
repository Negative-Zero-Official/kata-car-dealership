import { Link, Route, Routes } from 'react-router'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { GuestRoute } from './auth/GuestRoute'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RegisterPage } from './pages/RegisterPage'

function AppHeader() {
  const { user, logout } = useAuth()

  return (
    <header className="on-ink bg-ink text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <h1 className="font-display text-2xl font-bold tracking-wide">
          <Link to="/" className="flex items-center gap-2 rounded">
            <span aria-hidden="true" className="hang-tag h-5 w-8 bg-tag" />
            Car Dealership
          </Link>
        </h1>
        {user && (
          <button
            type="button"
            onClick={logout}
            className="btn border border-white/30 text-white hover:border-white"
          >
            Log out
          </button>
        )}
      </div>
    </header>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppHeader />
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
