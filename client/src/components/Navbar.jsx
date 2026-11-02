import { Link, useLocation } from 'react-router-dom'
import { Rocket, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/useAuth'

export function Navbar({ currentProjectName }) {
  const { user, isAuthenticated, logout } = useAuth()
  const location = useLocation()
  const isProjectDetail = location.pathname.startsWith('/projects/')

  return (
    <header className="border-b border-dark-800 bg-dark-900/70 backdrop-blur sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
      {/* Brand & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 group-hover:scale-105 transition-transform">
            <Rocket className="w-4 h-4" />
          </div>
          <span className="font-bold text-base tracking-tight text-white group-hover:text-brand-500 transition-colors">
            Launchpad
          </span>
        </Link>

        {isProjectDetail && currentProjectName && (
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-gray-200 font-semibold">{currentProjectName}</span>
          </div>
        )}
      </div>

      {/* User Status / Actions */}
      <div className="flex items-center gap-4">
        {isAuthenticated && user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="w-7 h-7 rounded-full border border-dark-700 bg-dark-800"
              />
              <span className="font-mono text-xs text-gray-300 hidden sm:inline">
                @{user.username}
              </span>
            </div>

            <button
              onClick={logout}
              className="p-1.5 sm:px-2.5 sm:py-1 text-xs rounded bg-dark-800 hover:bg-dark-700 text-gray-400 hover:text-white flex items-center gap-1.5 transition"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default Navbar

