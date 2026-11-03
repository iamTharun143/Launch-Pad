import { Link } from 'react-router-dom'

// Shared boxes for "loading failed" and "nothing here yet", so every page looks the same.

// Red box. Retry shows only when trying again could help (not for 403/404).
export function ErrorState({ title, message, canRetry = true, onRetry, showBackLink = true }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-medium text-red-700">{title}</p>
      {message && <p className="mt-1 text-sm text-red-600">{message}</p>}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {canRetry && onRetry && (
          <button onClick={onRetry} className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
            Retry
          </button>
        )}
        {showBackLink && (
          <Link to="/dashboard" className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-100">
            Back to projects
          </Link>
        )}
      </div>
    </div>
  )
}

// Dashed box with a title, a hint, and an optional button (children).
export function EmptyState({ title, text, children }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <p className="font-medium">{title}</p>
      {text && <p className="mt-1 text-sm text-gray-500">{text}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
