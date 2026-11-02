import { Link, Outlet } from 'react-router-dom'

// The shell around every logged-in page: a top bar, then the page itself.
// <Outlet /> is where React Router draws the current child route.
export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link to="/dashboard" className="font-bold">
            Launchpad
          </Link>
          <Link to="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            Dashboard
          </Link>
          <Link to="/projects/new" className="text-sm text-gray-600 hover:text-gray-900">
            New Project
          </Link>
          <Link to="/login" className="ml-auto text-sm text-gray-600 hover:text-gray-900">
            Login
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
