import { useCallback, useEffect, useState } from 'react'

import { getApiErrorMessage } from '../services/api'
import { fetchLiveness, fetchReadiness, type LivenessResponse } from '../services/health'

export type BackendState = 'checking' | 'online' | 'degraded' | 'offline'

export interface BackendHealth {
  state: BackendState
  info: LivenessResponse | null
  error: string | null
  refresh: () => Promise<void>
}

type HealthOutcome =
  | { ok: true; info: LivenessResponse; state: BackendState }
  | { ok: false; error: string }

/** Plain async query - keeps the hook itself free of result-handling duplication. */
async function loadHealth(): Promise<HealthOutcome> {
  try {
    const liveness = await fetchLiveness()
    const readiness = await fetchReadiness()
    return {
      ok: true,
      info: liveness,
      state: readiness.database === 'connected' ? 'online' : 'degraded',
    }
  } catch (caught) {
    return { ok: false, error: getApiErrorMessage(caught) }
  }
}

/**
 * Polls the API so the UI always reflects the real connection state.
 * - online   : API reachable and database connected
 * - degraded : API reachable but database unreachable
 * - offline  : API not reachable at all
 */
export function useBackendHealth(pollIntervalMs = 15_000): BackendHealth {
  const [state, setState] = useState<BackendState>('checking')
  const [info, setInfo] = useState<LivenessResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const apply = useCallback((outcome: HealthOutcome) => {
    if (outcome.ok) {
      setInfo(outcome.info)
      setState(outcome.state)
      setError(null)
    } else {
      setState('offline')
      setError(outcome.error)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const outcome = await loadHealth()
      if (cancelled) return
      apply(outcome)
    }

    void run()
    const timer = window.setInterval(() => void run(), pollIntervalMs)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [apply, pollIntervalMs])

  const refresh = useCallback(async () => {
    apply(await loadHealth())
  }, [apply])

  return { state, info, error, refresh }
}
