import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Layout from './components/Layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Computers from './pages/Computers'
import Clients from './pages/Clients'
import Rentals from './pages/Rentals'
import Settings from './pages/Settings'
import Reports from './pages/Reports'
import Response from './pages/Response'
// import Billing from './pages/Billing'

export default function App() {
  const { isAuthenticated, isLoading, initialize } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    initialize()
  }, [initialize])

  // Public response page — no auth needed
  if (location.pathname.startsWith('/r/')) {
    return (
      <Routes>
        <Route path="/r/:token" element={<Response />} />
      </Routes>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-text-secondary text-lg">טוען...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/computers" element={<Computers />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/rentals" element={<Rentals />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        {/* <Route path="/billing" element={<Billing />} /> */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
