import { AlertTriangle, RotateCw } from 'lucide-react'

import { Button } from './Button'

interface ErrorStateProps {
  message: string
  onRetry?: () => void
  className?: string
}

/** Recoverable failure. Always offers a way forward rather than a dead end. */
export function ErrorState({ message, onRetry, className = '' }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`sb-glass flex flex-col items-center rounded-2xl px-6 py-10 text-center ${className}`}
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/12 text-rose-300 ring-1 ring-rose-400/25">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-display text-base font-semibold text-white">
        Something went wrong
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-slate-400">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          className="mt-5"
          icon={<RotateCw className="h-4 w-4" />}
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </div>
  )
}

/** Inline, non-blocking error used inside forms and cards. */
export function InlineError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  )
}
