import { AiOrb } from '../ui/AiOrb'

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4">
        <AiOrb size={96} />
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

/**
 * Fallback for a lazily loaded route.
 * Deliberately short: it replaces only the content area, so the surrounding
 * layout (sidebar or header) stays put instead of flashing a full-page loader.
 */
export function ContentLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <div className="flex flex-col items-center gap-3">
        <AiOrb size={64} />
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}
