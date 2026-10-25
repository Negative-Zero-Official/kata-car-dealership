import { Link, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

function App() {
  return (
    <AuthProvider>
      <header className="on-ink bg-ink text-white">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-3 sm:px-6">
          <h1 className="font-display text-2xl font-bold tracking-wide">
            <Link to="/" className="flex items-center gap-2 rounded">
              <span aria-hidden="true" className="hang-tag h-5 w-8 bg-tag" />
              Car Dealership
            </Link>
          </h1>
        </div>
      </header>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
