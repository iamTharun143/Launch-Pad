import { useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import Spinner from '../components/Spinner.jsx'
import { usePageTitle } from '../usePageTitle.js'

// The API sends the browser here after GitHub login: /auth/callback?token=<JWT>
export default function AuthCallback() {
  usePageTitle('Logging in')
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { login } = useAuth()
  const navigate = useNavigate()
  // React's StrictMode runs effects twice in development; this makes us log in once.
  const started = useRef(false)

  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    // Save the token, load the user, then go to the dashboard.
    // replace: true removes this page from history, so Back doesn't return here.
    login(token).then(() => navigate('/dashboard', { replace: true }))
  }, [token, login, navigate])

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 px-4 text-center">
        <p className="text-red-600">Login failed: no token came back from the server.</p>
        <Link to="/login" className="font-medium text-indigo-600 hover:underline">
          Try again
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Spinner label="Logging you in…" />
    </div>
  )
}
