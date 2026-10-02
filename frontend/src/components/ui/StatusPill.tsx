export type StatusTone = 'ok' | 'warn' | 'error' | 'idle'

const TONE_STYLES: Record<StatusTone, { dot: string; text: string; ring: string }> = {
  ok: { dot: 'bg-emerald-400', text: 'text-emerald-200', ring: 'ring-emerald-400/30' },
  warn: { dot: 'bg-amber-400', text: 'text-amber-200', ring: 'ring-amber-400/30' },
  error: { dot: 'bg-rose-400', text: 'text-rose-200', ring: 'ring-rose-400/30' },
  idle: { dot: 'bg-slate-500', text: 'text-slate-300', ring: 'ring-slate-500/30' },
}

interface StatusPillProps {
  tone: StatusTone
  label: string
  /** Adds a soft "breathing" dot for live/active states. */
  pulse?: boolean
}

export function StatusPill({ tone, label, pulse = false }: StatusPillProps) {
  const styles = TONE_STYLES[tone]

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium ring-1 ${styles.ring} ${styles.text}`}
      role="status"
    >
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${styles.dot}`}
          />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      </span>
      {label}
    </span>
  )
}
