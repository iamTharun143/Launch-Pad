import { Link } from 'react-router-dom'
import { usePageTitle } from '../usePageTitle.js'
import Logo from '../components/Logo.jsx'

export default function NotFound() {
  usePageTitle('Page not found')
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 px-4 text-center">
      <Link to="/dashboard" aria-label="Launchpad home">
        <Logo />
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="text-sm text-gray-500">That address doesn't match any page.</p>
      <Link to="/dashboard" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
        Back to projects
      </Link>
    </div>
  )
}
