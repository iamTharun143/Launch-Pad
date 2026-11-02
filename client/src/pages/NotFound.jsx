import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-gray-50 px-4">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link to="/dashboard" className="text-blue-600 hover:underline">
        Back to dashboard
      </Link>
    </div>
  )
}
