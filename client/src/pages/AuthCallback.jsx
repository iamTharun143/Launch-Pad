import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/useAuth'

export function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState(() =>
    searchParams.get('token') ? null : 'Missing authentication token in URL callback'
  )

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) return

    login(token)
      .then(() => {
        navigate('/', { replace: true })
      })
      .catch((err) => {
        setError(err.response?.data?.error || err.message || 'Authentication exchange failed')
      })
  }, [searchParams, login, navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-8 rounded-2xl bg-dark-900 border border-red-900/40 max-w-md w-full">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Login Failed</h2>
          <p className="text-xs text-red-400 font-mono mt-2 mb-6">{error}</p>
          <Link
            to="/login"
            className="px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-white text-xs font-medium inline-block transition"
          >
            Return to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-6 text-center">
      <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mb-4" />
      <p className="text-sm font-mono text-gray-400">Completing GitHub authentication...</p>
    </div>
  )
}

export default AuthCallback
