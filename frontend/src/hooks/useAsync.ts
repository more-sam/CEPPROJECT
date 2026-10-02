import { useCallback, useEffect, useRef, useState } from 'react'

import { getApiErrorMessage } from '../services/api'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  /** Re-run the loader (e.g. from an error state's retry button). */
  reload: () => void
  /** Update local state without refetching (optimistic updates). */
  setData: (value: T | null) => void
}

/**
 * Loads data on mount and whenever `deps` change.
 *
 * Guards against React 18/19 StrictMode's double-invocation and against a
 * slower earlier request overwriting a newer one.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  options: { enabled?: boolean } = {},
): AsyncState<T> {
  const enabled = options.enabled ?? true
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const loaderRef = useRef(loader)
  loaderRef.current = loader

  const requestId = useRef(0)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    const id = ++requestId.current
    let cancelled = false

    setLoading(true)
    setError(null)

    loaderRef
      .current()
      .then((result) => {
        // Ignore a stale response from a superseded request.
        if (cancelled || id !== requestId.current) return
        setData(result)
      })
      .catch((caught) => {
        if (cancelled || id !== requestId.current) return
        setError(getApiErrorMessage(caught))
      })
      .finally(() => {
        if (cancelled || id !== requestId.current) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, ...deps])

  const reload = useCallback(() => setNonce((value) => value + 1), [])

  return { data, loading, error, reload, setData }
}
