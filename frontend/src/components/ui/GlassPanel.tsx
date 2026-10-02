import type { ReactNode } from 'react'

interface GlassPanelProps {
  children: ReactNode
  className?: string
}

/** Frosted surface used for every floating card / bar in the product. */
export function GlassPanel({ children, className = '' }: GlassPanelProps) {
  return <div className={`sb-glass rounded-2xl ${className}`}>{children}</div>
}
