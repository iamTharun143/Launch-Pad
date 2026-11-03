import { Navigate, Outlet } from 'react-router-dom'
import { getToken } from '../api.js'
import { useAuth } from '../auth/useAuth.js'
import Spinner from './Spinner.jsx'

// Wraps every page that needs a logged-in user.
// No token -> Login page. Still loading the user -> spinner. Otherwise -> the page.
export default function ProtectedRoute() {
  const { status, error, reload, logout } = useAuth()

  if (!getToken()) return <Navigate to="/login" replace />

  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 px-4 text-center">
        <p className="text-red-600">Could not load your account: {error}</p>
        <div className="flex gap-2">
          <button onClick={reload} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
            Retry
          </button>
          <button onClick={logout} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100">
            Log out
          </button>
        </div>
      </div>
    )
  }

  if (status !== 'ready') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    )
  }

  return <Outlet />
}
