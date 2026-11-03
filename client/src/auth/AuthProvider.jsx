import { useCallback, useEffect, useState } from 'react'
import { clearToken, getErrorMessage, getMe, getToken, saveToken } from '../api.js'
import { AuthContext } from './useAuth.js'

// Loads the logged-in user once (GET /api/me) and shares it with every page.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // 'idle' = no token, 'loading' = fetching /api/me, 'ready' = user loaded, 'error' = fetch failed
  const [status, setStatus] = useState(getToken() ? 'loading' : 'idle')
  const [error, setError] = useState('')

  // Fetches the user. State is only set inside .then/.catch, after the request finishes.
  const fetchUser = useCallback(
    () =>
      getMe().then(
        (me) => {
          setUser(me)
          setStatus('ready')
        },
        (err) => {
          // A 401 is handled in api.js (token cleared, sent to /login).
          setError(getErrorMessage(err))
          setStatus('error')
        },
      ),
    [],
  )

  // Same as fetchUser, but first shows the loading state (for login and Retry).
  const loadUser = useCallback(() => {
    setStatus('loading')
    setError('')
    return fetchUser()
  }, [fetchUser])

  // On first page load: if a token was saved earlier, load the user.
  // This is what keeps you logged in after a refresh.
  // (status already starts as 'loading' when there is a token.)
  useEffect(() => {
    if (getToken()) fetchUser()
  }, [fetchUser])

  // Called by AuthCallback with the JWT from the URL.
  const login = useCallback(
    (token) => {
      saveToken(token)
      return loadUser()
    },
    [loadUser],
  )

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    setStatus('idle')
  }, [])

  return (
    <AuthContext.Provider value={{ user, status, error, login, logout, reload: loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}
