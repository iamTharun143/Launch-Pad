import { Navigate, Outlet } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useAuth } from '../context/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mb-4" />
        <p className="text-sm font-mono text-gray-400">Verifying session...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute

