import { AlertCircle, CheckCircle2, Clock, MinusCircle } from 'lucide-react'

import { Badge } from './Badge'

/**
 * ApplicationStatus renders the honest five-state pill required by the spec:
 *
 *   open    - applications are being accepted
 *   closed  - applications are closed (no live vacancy implied)
 *   expired - the listing's window closed on its own
 *   unknown - the row may simply not have been re-checked; it proves nothing
 *
 * Seeded demo listings carry an explicit `status`, so the UI can render the
 * real state instead of inventing one. A seeded row with `status = "unknown"`
 * is always shown as unknown, never as open.
 */export function ApplicationStatus({ status }: { status: string }) {
  const tone: 'success' | 'danger' | 'warn' | 'neutral' = ({
    open: 'success',
    closed: 'danger',
    expired: 'warn',
    unknown: 'neutral',
  })[status] ?? 'neutral'

  const icon =
    ({
      open: CheckCircle2,
      closed: AlertCircle,
      expired: Clock,
      unknown: MinusCircle,
    })[status] ?? MinusCircle

  return (
    <Badge tone={tone}>
      <span className="sr-only">{status}</span>
      <icon className="h-3 w-3" aria-hidden="true" />
      {status}
    </Badge>
  )
}
