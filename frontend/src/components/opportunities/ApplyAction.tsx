import { ExternalLink, Megaphone } from 'lucide-react'

import type { ApplicationStatus } from '../../types'
import { displayHost, isSafeExternalUrl } from '../../utils/links'

/**
 * The apply affordance for one opportunity, derived purely from stored data.
 *
 * The rule this encodes (never break it): an active "Apply" link appears only
 * when the row's own `status` is `open` **and** a real, safe `application_url`
 * exists. Every other state is rendered as an honest, non-clickable label, so
 * the UI cannot imply that a closed or unverified listing is still accepting
 * applications.
 *
 *   open    + url     -> "Apply Now"  (external, noopener noreferrer)
 *   open    + no url  -> "Application link unavailable"
 *   closed            -> "Applications closed"
 *   expired           -> "Expired"
 *   unknown           -> "Status unknown"
 *
 * "Visit company website" is offered independently whenever a verified website
 * exists, including for closed listings - reading about a company is not
 * applying to it.
 */
export function canApply(status: string, applicationUrl: string): boolean {
  return status === 'open' && isSafeExternalUrl(applicationUrl)
}

const UNAVAILABLE: Record<string, string> = {
  closed: 'Applications closed',
  expired: 'Expired',
  unknown: 'Status unknown',
}

interface ApplyActionProps {
  status: ApplicationStatus | string
  applicationUrl: string
  /** Company's official website, or null when none is on file. */
  websiteUrl?: string | null
  /** Show the website link as well as the apply control. */
  showWebsite?: boolean
  className?: string
}

export function ApplyAction({
  status,
  applicationUrl,
  websiteUrl,
  showWebsite = true,
  className = '',
}: ApplyActionProps) {
  const applyable = canApply(status, applicationUrl)
  const host = displayHost(websiteUrl)

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {applyable ? (
        <a
          href={applicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-500/20 sm:justify-start"
        >
          <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
          Apply now
        </a>
      ) : (
        <span className="inline-flex items-center justify-center rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-center text-[11px] font-medium text-slate-500 sm:justify-start">
          {status === 'open'
            ? 'Application link unavailable'
            : (UNAVAILABLE[status] ?? 'Status unknown')}
        </span>
      )}

      {showWebsite &&
        (isSafeExternalUrl(websiteUrl) ? (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={websiteUrl}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white sm:justify-start"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            {host ? `${host}` : 'Company website'}
          </a>
        ) : (
          <span className="inline-flex items-center justify-center rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-center text-[11px] font-medium text-slate-500 sm:justify-start">
            Official website unavailable
          </span>
        ))}
    </div>
  )
}