import type { ReactNode } from 'react'

export type BadgeTone =
  | 'neutral'
  | 'brand'
  | 'aqua'
  | 'success'
  | 'warn'
  | 'danger'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-white/6 text-slate-300 ring-white/10',
  brand: 'bg-brand-500/15 text-brand-300 ring-brand-400/25',
  aqua: 'bg-aqua-500/15 text-aqua-400 ring-aqua-500/25',
  success: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/25',
  warn: 'bg-amber-500/15 text-amber-300 ring-amber-400/25',
  danger: 'bg-rose-500/15 text-rose-300 ring-rose-400/25',
}

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
