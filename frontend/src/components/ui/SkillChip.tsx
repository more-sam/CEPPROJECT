import { X } from 'lucide-react'

export type SkillState = 'matched' | 'missing' | 'learning' | 'neutral'

const STATES: Record<SkillState, { chip: string; dot: string }> = {
  matched: {
    chip: 'bg-emerald-500/12 text-emerald-200 ring-emerald-400/25',
    dot: 'bg-emerald-400',
  },
  missing: {
    chip: 'bg-amber-500/12 text-amber-200 ring-amber-400/25',
    dot: 'bg-amber-400',
  },
  learning: {
    chip: 'bg-brand-500/15 text-brand-300 ring-brand-400/25',
    dot: 'bg-brand-400',
  },
  neutral: {
    chip: 'bg-white/6 text-slate-300 ring-white/10',
    dot: 'bg-slate-500',
  },
}

interface SkillChipProps {
  label: string
  state?: SkillState
  /** Optional trailing detail, e.g. an importance or confidence value. */
  detail?: string
  onRemove?: () => void
  onAdd?: () => void
  className?: string
}

/** One skill in a set. The state drives the colour so meaning stays legible. */
export function SkillChip({
  label,
  state = 'neutral',
  detail,
  onRemove,
  onAdd,
  className = '',
}: SkillChipProps) {
  const styles = STATES[state]
  const interactive = Boolean(onRemove || onAdd)

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ${styles.chip} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} aria-hidden="true" />
      {label}
      {detail && <span className="text-[10px] opacity-70">{detail}</span>}
      {interactive && (
        <button
          type="button"
          onClick={onRemove ?? onAdd}
          aria-label={onRemove ? `Remove ${label}` : `Add ${label}`}
          className="ml-0.5 grid h-4 w-4 place-items-center rounded-full transition hover:bg-white/15"
        >
          {onRemove ? (
            <X className="h-3 w-3" />
          ) : (
            <span className="text-sm leading-none">+</span>
          )}
        </button>
      )}
    </span>
  )
}
