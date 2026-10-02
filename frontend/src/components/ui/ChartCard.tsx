import type { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

/** Titled glass panel used to frame every chart so the layout stays uniform. */
export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}: ChartCardProps) {
  return (
    <section className={`sb-glass rounded-2xl p-5 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-semibold text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}
