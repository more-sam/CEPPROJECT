import { Bookmark, BookmarkCheck, CalendarDays, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'

import type { OpportunityCard as OpportunityCardType } from '../../types'
import { displayHost, isSafeExternalUrl } from '../../utils/links'
import { ApplicationStatus } from '../ui/ApplicationStatus'
import { Badge } from '../ui/Badge'
import { CompanyLogo } from '../ui/CompanyLogo'
import { CompatibilityRing } from '../ui/CompatibilityRing'
import { SkillChip } from '../ui/SkillChip'
import { ApplyAction } from './ApplyAction'
import { ease } from '../../motion/tokens'

const WORK_TYPE_LABEL: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
}

const EMPLOYMENT_LABEL: Record<string, string> = {
  internship: 'Internship',
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
}

/** "3 days ago" / "today" - omitted entirely when there is no stored date. */
function relativeDate(value: string | null): string | null {
  if (!value) return null
  const then = Date.parse(value)
  if (Number.isNaN(then)) return null
  const days = Math.floor((Date.now() - then) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

interface OpportunityCardProps {
  opportunity: OpportunityCardType
  /** Called with the new saved state after a successful toggle. */
  onToggleSave?: (jobId: number, nextSaved: boolean) => void
  busy?: boolean
}

/**
 * The opportunity card used across the opportunities grid, the dashboard and
 * the company pages.
 *
 * Shows, in one scan: who is hiring, the role, SkillBridge Compatibility, the
 * exact matched / missing skills, the honest application status, the stored
 * website and the correct apply affordance.
 *
 * Provenance is never hidden: a seeded row is labelled as demo data, because
 * it is not a live vacancy.
 */
export function OpportunityCard({
  opportunity,
  onToggleSave,
  busy,
}: OpportunityCardProps) {
  const {
    id,
    title,
    company,
    location,
    employment_type,
    work_type,
    experience_level,
    source,
    status,
    posted_at,
    compatibility_score,
    matched_skills,
    missing_skills,
    is_saved,
    application_url,
  } = opportunity

  // Only show a handful of skills per group so cards stay scannable.
  const shownMatched = matched_skills.slice(0, 4)
  const shownMissing = missing_skills.slice(0, 4)
  const posted = relativeDate(posted_at)
  const isDemo = (source ?? '').toUpperCase() === 'DEMO'
  const websiteHost = displayHost(company.website_url)
  const reduced = useReducedMotion()

  return (
    <motion.article
      className="sb-glass flex flex-col gap-4 rounded-2xl p-5"
      whileHover={reduced ? undefined : { y: -3, scale: 1.01 }}
      whileTap={reduced ? undefined : { scale: 0.992 }}
      transition={{ duration: 0.22, ease: ease.out }}
    >      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <CompanyLogo
            companyName={company.name}
            logoUrl={company.logo_url}
            websiteUrl={company.website_url}
            size={40}
          />
          <div className="min-w-0">
            <h3 className="truncate font-display text-sm font-semibold text-white">
              <Link to={`/opportunities/${id}`} className="hover:text-brand-200">
                {title}
              </Link>
            </h3>
            <p className="truncate text-xs text-slate-400">
              {/* The company name is a real link into the company page. */}
              <Link to={`/companies/${company.id}`} className="hover:text-brand-300">
                {company.name}
              </Link>
            </p>
          </div>
        </div>

        {onToggleSave && (
          <motion.button
            type="button"
            onClick={() => onToggleSave(id, !is_saved)}
            disabled={busy}
            aria-pressed={is_saved}
            aria-label={is_saved ? `Unsave ${title}` : `Save ${title}`}
            whileTap={reduced ? undefined : { scale: 0.94 }}
            transition={{ duration: 0.12, ease: ease.out }}
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition disabled:opacity-50 ${
              is_saved
                ? 'border-brand-400/30 bg-brand-500/15 text-brand-300'
                : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {is_saved ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </motion.button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
          <MapPin className="h-3 w-3" />
          {location}
        </span>
        <Badge tone="brand">{EMPLOYMENT_LABEL[employment_type] ?? employment_type}</Badge>
        <Badge>{WORK_TYPE_LABEL[work_type] ?? work_type}</Badge>
        <Badge>{experience_level}</Badge>
        {posted && (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <CalendarDays className="h-3 w-3" />
            Posted {posted}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <CompatibilityRing value={compatibility_score} size={72} strokeWidth={7} compact />
        <div className="min-w-0 flex-1 space-y-2">
          {shownMatched.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {shownMatched.map((skill) => (
                <SkillChip key={skill} label={skill} state="matched" />
              ))}
              {matched_skills.length > shownMatched.length && (
                <span className="self-center text-[11px] text-slate-500">
                  +{matched_skills.length - shownMatched.length} more
                </span>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">
              {compatibility_score === null
                ? 'Sign in and add skills to see your alignment.'
                : 'No matched skills yet.'}
            </p>
          )}

          {shownMissing.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {shownMissing.map((skill) => (
                <SkillChip key={skill} label={skill} state="missing" />
              ))}
              {missing_skills.length > shownMissing.length && (
                <span className="self-center text-[11px] text-slate-500">
                  +{missing_skills.length - shownMissing.length} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Provenance: a demo row must never read as a live vacancy. */}
      <div className="flex flex-wrap items-center gap-2 border-t border-white/8 pt-3">
        <ApplicationStatus status={status} expiresAt={opportunity.expires_at} />
        {isDemo && (
          <span className="text-[10px] text-slate-500">Demo opportunity</span>
        )}
        {!isDemo && opportunity.last_verified_at && (
          <span className="text-[10px] text-slate-500">
            Verified {relativeDate(opportunity.last_verified_at) ?? 'recently'}
          </span>
        )}
      </div>

      {/* Company website line, always explicit about availability. */}
      <p className="text-[11px] text-slate-500">
        Official website:{' '}
        {isSafeExternalUrl(company.website_url) ? (
          <a
            href={company.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-300 hover:text-brand-200"
          >
            {websiteHost}
          </a>
        ) : (
          <span className="text-slate-500">unavailable</span>
        )}
      </p>

      {/* Actions stack full-width on narrow screens. */}
      <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <ApplyAction
          status={status}
          applicationUrl={application_url}
          websiteUrl={company.website_url}
          showWebsite={false}
        />
        <Link
          to={`/opportunities/${id}`}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10 sm:justify-start"
        >
          View opportunity
        </Link>
      </div>
    </motion.article>
  )
}