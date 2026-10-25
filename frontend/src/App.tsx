import { Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="text-2xl font-semibold">Vehicles</h2>
    </main>
  )
}

function App() {
  return (
    <AuthProvider>
      <header className="border-b px-4 py-3">
        <h1 className="text-xl font-semibold">Car Dealership</h1>
      </header>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
