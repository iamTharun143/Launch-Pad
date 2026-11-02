import { useState, useEffect, useCallback, useMemo } from 'react'
import { AuthContext } from './authContextDef'
import { getMe, getToken, setToken, removeToken } from '../api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setTokenState] = useState(() => getToken())
  const [isLoading, setIsLoading] = useState(() => Boolean(getToken()))

  // Initial load: only runs if a token was present at mount
  useEffect(() => {
    let ignore = false
    const currentToken = getToken()
    if (!currentToken) return

    getMe()
      .then((userData) => {
        if (!ignore) {
          setUser(userData)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (!ignore) {
          removeToken()
          setTokenState(null)
          setUser(null)
          setIsLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  // Refetch user profile on demand
  const refreshUser = useCallback(async () => {
    const currentToken = getToken()
    if (!currentToken) {
      setUser(null)
      return
    }
    try {
      const userData = await getMe()
      setUser(userData)
    } catch {
      removeToken()
      setTokenState(null)
      setUser(null)
    }
  }, [])

  // Login action
  const login = useCallback(async (newToken) => {
    setToken(newToken)
    setTokenState(newToken)
    setIsLoading(true)
    try {
      const userData = await getMe()
      setUser(userData)
    } catch {
      removeToken()
      setTokenState(null)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Logout action
  const logout = useCallback(() => {
    removeToken()
    setTokenState(null)
    setUser(null)
  }, [])

  // GitHub login redirect helper
  const redirectToGitHub = useCallback(() => {
    const isMock = import.meta.env.VITE_USE_MOCKS === 'true'
    if (isMock) {
      const mockToken = 'mock_jwt_token_launchpad_' + Date.now()
      window.location.href = `/auth/callback?token=${mockToken}`
    } else {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      window.location.href = `${apiUrl}/auth/github`
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      login,
      logout,
      redirectToGitHub,
      refreshUser,
    }),
    [user, token, isLoading, login, logout, redirectToGitHub, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
