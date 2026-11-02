import { Navigate } from 'react-router-dom'
import { API_URL, USE_MOCKS, getToken } from '../api.js'
import Logo from '../components/Logo.jsx'
import { users as mockUsers } from '../mocks/data.js'
import { usePageTitle } from '../usePageTitle.js'

// Real mode: the button leaves our app and goes to the API, which sends the
// user to GitHub and back to /auth/callback?token=<JWT>.
// Mock mode: skip GitHub and pretend the API sent us a token for a fake user.
const githubLoginUrl = `${API_URL}/auth/github`
const mockLoginUrl = (userId) => `/auth/callback?token=mock-token-${userId}`

export default function Login() {
  usePageTitle('Log in')
  // Already logged in? No need to see this page.
  if (getToken()) return <Navigate to="/dashboard" replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <Logo size="lg" />
        <p className="mt-4 text-gray-600">
          One click turns a GitHub project into a live website, with teams, roles and live build logs.
        </p>

        {USE_MOCKS ? (
          <div className="mt-6 space-y-2">
            {mockUsers.map((u) => (
              <a
                key={u.id}
                href={mockLoginUrl(u.id)}
                className="flex w-full items-center gap-3 rounded-md border border-gray-300 px-4 py-2 text-left text-sm font-medium hover:bg-gray-50"
              >
                <img src={u.avatarUrl} alt="" className="size-6 rounded-full bg-gray-200" />
                Continue as {u.username}
              </a>
            ))}
            <p className="pt-1 text-xs text-gray-400">Mock mode: pick a fake user to test their role</p>
          </div>
        ) : (
          <a
            href={githubLoginUrl}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2.5 font-medium text-white hover:bg-gray-700"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="size-5" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Continue with GitHub
          </a>
        )}
      </div>
    </div>
  )
}
