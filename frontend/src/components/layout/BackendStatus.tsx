import { RefreshCw } from 'lucide-react'

import { useBackendHealth, type BackendState } from '../../hooks/useBackendHealth'
import { StatusPill, type StatusTone } from '../ui/StatusPill'

const PRESENTATION: Record<BackendState, { tone: StatusTone; label: string; pulse: boolean }> = {
  checking: { tone: 'idle', label: 'Checking API…', pulse: false },
  online: { tone: 'ok', label: 'Backend connected', pulse: true },
  degraded: { tone: 'warn', label: 'API up · database unavailable', pulse: true },
  offline: { tone: 'error', label: 'Backend offline', pulse: false },
}

/**
 * Live health readout. This is the Phase 1 proof that the React client and the
 * FastAPI service really talk to each other - it is a real HTTP request, not a mock.
 */
export function BackendStatus() {
  const { state, info, refresh } = useBackendHealth()
  const presentation = PRESENTATION[state]

  return (
    <div className="flex items-center gap-2">
      <StatusPill
        tone={presentation.tone}
        label={presentation.label}
        pulse={presentation.pulse}
      />
      {info && (
        <span className="hidden text-xs text-slate-500 sm:inline">
          v{info.version} · {info.environment}
        </span>
      )}
      <button
        type="button"
        onClick={() => void refresh()}
        className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
        aria-label="Re-check backend connection"
        title="Re-check backend connection"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
