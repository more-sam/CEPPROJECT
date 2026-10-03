import { AlertCircle, CheckCircle2, Clock, MinusCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { ApplicationStatus as ApplicationStatusValue } from '../../types'
import { Badge } from './Badge'
import type { BadgeTone } from './Badge'

/**
 * Application status, rendered honestly.
 *
 * The four stored states map to four different claims, and the UI must never
 * blur them:
 *
 *   open    - applications are being accepted
 *   closed  - applications are closed
 *   expired - the listing's own window closed
 *   unknown - the row may simply not have been re-checked; it proves nothing,
 *             so it is never presented as "open"
 *
 * "Closing soon" is derived, not stored: it only appears for a genuinely open
 * listing whose stored `expires_at` is within the window below.
 */
interface StatusMeta {
  label: string
  tone: BadgeTone
  Icon: LucideIcon
}

const STATUS_META: Record<ApplicationStatusValue, StatusMeta> = {
  open: { label: 'Open for applications', tone: 'success', Icon: CheckCircle2 },
  closed: { label: 'Applications closed', tone: 'danger', Icon: AlertCircle },
  expired: { label: 'Expired', tone: 'warn', Icon: Clock },
  unknown: { label: 'Status unknown', tone: 'neutral', Icon: MinusCircle },
}

/** An open listing closing within this many days reads as "closing soon". */
const CLOSING_SOON_DAYS = 7

interface ApplicationStatusProps {
  status: ApplicationStatusValue | string
  /** Stored closing date, used only to derive the "closing soon" variant. */
  expiresAt?: string | null
  /** Render the longer sentence instead of the compact uppercase form. */
  full?: boolean
  className?: string
}

/** True when an open listing's stored closing date is imminent. */
function isClosingSoon(status: string, expiresAt?: string | null): boolean {
  if (status !== 'open' || !expiresAt) return false
  const closes = Date.parse(expiresAt)
  if (Number.isNaN(closes)) return false
  const remaining = closes - Date.now()
  return remaining > 0 && remaining <= CLOSING_SOON_DAYS * 24 * 60 * 60 * 1000
}

export function ApplicationStatus({
  status,
  expiresAt,
  full = false,
  className = '',
}: ApplicationStatusProps) {
  const meta = STATUS_META[status as ApplicationStatusValue] ?? STATUS_META.unknown
  const { Icon, tone } = meta

  const label = isClosingSoon(status, expiresAt)
    ? 'Closing soon'
    : full
      ? meta.label
      : meta.label.toUpperCase()

  const toneForDisplay =
    isClosingSoon(status, expiresAt) && tone === 'success' ? 'warn' : tone

  return (
    <Badge tone={toneForDisplay} className={className}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </Badge>
  )
}