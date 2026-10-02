interface CompatibilityRingProps {
  /** 0-100, or null when the visitor is anonymous / has no skills yet. */
  value: number | null
  size?: number
  strokeWidth?: number
  label?: string
  /** Hide the small caption under the number. */
  compact?: boolean
}

/** Colour banding keeps the indicator interpretable at a glance. */
export function scoreTone(value: number): {
  stroke: string
  text: string
  band: 'strong' | 'good' | 'partial' | 'low'
  caption: string
} {
  if (value >= 70) {
    return { stroke: '#34d399', text: 'text-emerald-300', band: 'strong', caption: 'Strong alignment' }
  }
  if (value >= 50) {
    return { stroke: '#22d3ee', text: 'text-aqua-400', band: 'good', caption: 'Good alignment' }
  }
  if (value >= 25) {
    return { stroke: '#fbbf24', text: 'text-amber-300', band: 'partial', caption: 'Partial alignment' }
  }
  return { stroke: '#fb7185', text: 'text-rose-300', band: 'low', caption: 'Early alignment' }
}

/**
 * Signature visual #2 (spec §21): SkillBridge Compatibility.
 *
 * Always a skill-alignment figure - never labelled as a hiring probability.
 */
export function CompatibilityRing({
  value,
  size = 132,
  strokeWidth = 10,
  label = 'SkillBridge Compatibility',
  compact = false,
}: CompatibilityRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  if (value === null) {
    return (
      <div className="flex flex-col items-center gap-1.5" style={{ width: size }}>
        <div
          className="grid place-items-center rounded-full border border-dashed border-white/15"
          style={{ width: size, height: size }}
        >
          <span className="text-xs text-slate-500">No score yet</span>
        </div>
        {!compact && <span className="text-[11px] text-slate-500">{label}</span>}
      </div>
    )
  }

  const clamped = Math.max(0, Math.min(100, value))
  const tone = scoreTone(clamped)
  const dash = (clamped / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative grid place-items-center"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${label}: ${clamped.toFixed(0)} percent`}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={tone.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            style={{
              transition: 'stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1)',
              filter: `drop-shadow(0 0 6px ${tone.stroke}66)`,
            }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`font-display text-2xl font-semibold ${tone.text}`}>
            {clamped.toFixed(clamped % 1 === 0 ? 0 : 1)}
            <span className="text-sm">%</span>
          </span>
          {!compact && <span className="text-[10px] text-slate-500">{tone.caption}</span>}
        </div>
      </div>
      {!compact && (
        <span className="text-center text-[11px] font-medium text-slate-400">{label}</span>
      )}
    </div>
  )
}
