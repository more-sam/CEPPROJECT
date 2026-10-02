interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  tone?: 'brand' | 'success' | 'aqua'
  showLabel?: boolean
}

const TONES = {
  brand: 'from-brand-500 to-aqua-400',
  success: 'from-emerald-500 to-teal-400',
  aqua: 'from-aqua-500 to-brand-400',
}

export function ProgressBar({
  value,
  max = 100,
  className = '',
  tone = 'brand',
  showLabel = false,
}: ProgressBarProps) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8"
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r ${TONES[tone]}`}
          style={{
            width: `${percent}%`,
            transition: 'width 700ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>
      {showLabel && (
        <span className="w-10 shrink-0 text-right text-xs font-medium text-slate-400">
          {percent.toFixed(0)}%
        </span>
      )}
    </div>
  )
}
