import type { LucideIcon, } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  className?: string
}

/** Polished empty state - shown instead of a blank region (spec §32). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`sb-glass flex flex-col items-center rounded-2xl px-6 py-12 text-center ${className}`}
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/12 text-brand-300 ring-1 ring-brand-400/20">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-display text-base font-semibold text-white">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-400">{description}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  )
}
