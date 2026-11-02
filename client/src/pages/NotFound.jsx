import { Link } from 'react-router-dom'
import { FileQuestion, ArrowLeft } from 'lucide-react'

export function NotFound() {
  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-dark-900 border border-dark-800 flex items-center justify-center text-gray-500 mb-4">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold text-white tracking-tight">404</h1>
      <p className="text-gray-400 mt-2 text-sm max-w-sm">
        The page or project you were looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-900 border border-dark-700 hover:border-dark-600 text-sm font-medium text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>
    </div>
  )
}

export default NotFound

