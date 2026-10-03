import { createContext, useContext } from 'react'

import type { User } from '../types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  /** Whether the student has completed onboarding (profile answers saved). */
  hasProfile: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName?: string) => Promise<void>
  signOut: () => Promise<void>
  /** Re-read the session - used after onboarding to refresh `hasProfile`. */
  refresh: () => Promise<void>
  /** Clear the error badge once the student has seen it. */
  clearError: () => void
}

/**
 * The context and its hook live apart from `AuthProvider` on purpose.
 *
 * A module that exports both a component and a hook cannot be hot-reloaded by
 * React Fast Refresh, so editing the provider while the app was running tore
 * down the provider and every consumer threw
 * "useAuth must be used inside an <AuthProvider>". Keeping the hook in a module
 * with no component exports makes `AuthProvider` safely refreshable in place.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used inside an <AuthProvider>.')
  }
  return context
}

export const UseAuth = useAuth
