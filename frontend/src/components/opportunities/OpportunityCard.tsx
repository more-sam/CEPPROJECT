import { Bookmark, BookmarkCheck, ExternalLink, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { OpportunityCard as OpportunityCardType } from '../../types'
import { Badge } from '../ui/Badge'
import { CompanyLogo } from '../ui/CompanyLogo'
import { CompatibilityRing } from '../ui/CompatibilityRing'
import { SkillChip } from '../ui/SkillChip'
import { isSafeExternalUrl } from '../../utils/links'

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

interface OpportunityCardProps {
  opportunity: OpportunityCardType
  /** Called with the new saved state after a successful toggle. */
  onToggleSave?: (jobId: number, nextSaved: boolean) => void
  busy?: boolean
}

/** The single card shape used on the dashboard, opportunities and saved lists. */
export function OpportunityCard({ opportunity, onToggleSave, busy }: OpportunityCardProps) {
  const {
    id,
    title,
    company,
    location,
    employment_type,
    work_type,
    experience_level,
    compatibility_score,
    matched_skills,
    missing_skills,
    is_saved,
    application_url,
  } = opportunity

  // Only show a handful of skills per group so cards stay scannable.
  const shownMatched = matched_skills.slice(0, 4)
  const shownMissing = missing_skills.slice(0, 4)

  return (
    <article className="sb-glass flex flex-col gap-4 rounded-2xl p-5 transition hover:border-brand-400/25">
      <div className="flex items-start justify-between gap-3">
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
            <p className="truncate text-xs text-slate-400">{company.name}</p>
          </div>
        </div>

        {onToggleSave && (
          <button
            type="button"
            onClick={() => onToggleSave(id, !is_saved)}
            disabled={busy}
            aria-pressed={is_saved}
            aria-label={is_saved ? `Unsave ${title}` : `Save ${title}`}
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
          </button>
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
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {isSafeExternalUrl(application_url) ? (
          <a
            href={application_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            Apply on company site
            <ExternalLink className="ml-1 inline h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="inline-flex items-center rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-xs font-medium text-slate-500">
            Application link unavailable
          </span>
        )}
        <Link
          to={`/opportunities/${id}`}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
        >
          View opportunity
        </Link>
      </div>
    </article>
  )
}
