import { createContext, useContext } from 'react'

// The shared "who is logged in" box. AuthProvider fills it; any component reads it.
export const AuthContext = createContext(null)

// Any component can call useAuth() to read the user or log out.
export function useAuth() {
  return useContext(AuthContext)
}
