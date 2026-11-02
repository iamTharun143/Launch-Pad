import { Navigate } from 'react-router-dom'
import { Rocket, ShieldCheck, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/useAuth'

function GitHubIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  )
}

export function Login() {
  const { isAuthenticated, isLoading, redirectToGitHub, login } = useAuth()
  const isMock = import.meta.env.VITE_USE_MOCKS === 'true'

  if (isLoading) {
    return null
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-dark-950 text-gray-100 flex flex-col justify-between p-6 font-sans">
      <div className="max-w-md w-full mx-auto my-auto py-12">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 mx-auto mb-4">
            <Rocket className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Welcome to Launchpad</h1>
          <p className="text-sm text-gray-400 mt-2">
            Mini-Vercel: deploy frontend repos to isolated subdomains in seconds.
          </p>
        </div>

        {/* Auth Card */}
        <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 shadow-xl space-y-4">
          <div className="text-xs font-mono text-gray-400 flex items-center gap-2 pb-2 border-b border-dark-800">
            <ShieldCheck className="w-4 h-4 text-brand-500" />
            <span>GitHub OAuth 2.0 Authentication</span>
          </div>

          <button
            onClick={redirectToGitHub}
            className="w-full py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-white text-dark-950 font-medium text-sm flex items-center justify-center gap-2.5 transition active:scale-[0.98]"
          >
            <GitHubIcon className="w-4 h-4" />
            Sign in with GitHub
            <ArrowRight className="w-4 h-4 text-gray-500" />
          </button>

          {isMock && (
            <div className="pt-3 border-t border-dark-800">
              <button
                onClick={() => login('mock_jwt_token_for_dev')}
                className="w-full py-2 px-3 rounded-lg bg-dark-800 hover:bg-dark-700 text-xs font-mono text-brand-400 border border-dark-700 flex items-center justify-center gap-2 transition"
              >
                <span>[Mock Dev Mode] Quick Login as @octocat</span>
              </button>
            </div>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 text-center text-xs text-gray-500 space-y-1 font-mono">
          <p>Role-based access: Owners, Developers, Viewers</p>
          <p>Instant build logs &amp; one-click rollbacks</p>
        </div>
      </div>

      <footer className="text-center text-xs text-gray-600 font-mono py-2">
        Launchpad • Mini-Vercel Platform
      </footer>
    </div>
  )
}

export default Login
