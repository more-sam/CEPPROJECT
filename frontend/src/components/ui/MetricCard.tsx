import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: number
  suffix?: string
  hint?: string
}

/** One statistic in the dashboard header row. */
export function MetricCard({ icon: Icon, label, value, suffix = '', hint }: MetricCardProps) {
  return (
    <div className="sb-glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/12 text-brand-300 ring-1 ring-brand-400/20">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-white">
        {typeof value === 'number' ? value.toFixed(Number.isInteger(value) ? 0 : 1) : value}
        <span className="text-base text-slate-400">{suffix}</span>
      </p>
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  )
}
