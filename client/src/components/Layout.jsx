import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import Logo from './Logo.jsx'

// The shell around every logged-in page: a top bar, then the page itself.
// <Outlet /> is where React Router draws the current child route.
export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/dashboard" aria-label="Launchpad dashboard">
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <img src={user.avatarUrl} alt="" className="size-8 rounded-full bg-gray-200" />
            <span className="hidden text-sm font-medium sm:inline">{user.username}</span>
            <button
              onClick={handleLogout}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
            >
              Log out
            </button>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
