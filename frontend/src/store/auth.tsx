import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { getApiErrorMessage, isUnauthorized } from '../services/api'
import {
  fetchSession,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from '../services/auth'
import type { User } from '../types'
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext'

export type { AuthStatus }

/**
 * Session state.
 *
 * The access token lives in an httpOnly cookie that JavaScript cannot read, so
 * the only way to know whether a visitor is signed in is to ask the API once on
 * startup. Every consumer then reads from this context instead of re-checking.
 *
 * This module deliberately exports ONLY the component (plus a type): see the
 * note in `authContext.ts` about Fast Refresh.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [hasProfile, setHasProfile] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const session = await fetchSession()
      if (!session.authenticated || session.user === null) {
        setUser(null)
        setHasProfile(false)
        setStatus('anonymous')
        setError(null)
        return
      }
      setUser(session.user)
      setHasProfile(session.has_profile)
      setStatus('authenticated')
      setError(null)
    } catch (caught) {
      // A session that cannot be checked at all is reported as anonymous, but
      // the error is surfaced so a backend outage never looks like a logout.
      if (isUnauthorized(caught)) {
        setUser(null)
        setHasProfile(false)
        setStatus('anonymous')
        setError(null)
        return
      }
      setStatus('anonymous')
      setError(getApiErrorMessage(caught))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await loginRequest({ email, password })
    setUser(session.user)
    setHasProfile(session.has_profile)
    setStatus('authenticated')
    setError(null)
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, fullName?: string) => {
      const session = await registerRequest({
        email,
        password,
        full_name: fullName || undefined,
      })
      setUser(session.user)
      setHasProfile(session.has_profile)
      setStatus('authenticated')
      setError(null)
    },
    [],
  )

  const signOut = useCallback(async () => {
    try {
      await logoutRequest()
    } catch {
      // Even if the request fails the local state must still be cleared.
    }
    setUser(null)
    setHasProfile(false)
    setStatus('anonymous')
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      hasProfile,
      error,
      signIn,
      signUp,
      signOut,
      refresh,
      clearError,
    }),
    [status, user, hasProfile, error, signIn, signUp, signOut, refresh, clearError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
