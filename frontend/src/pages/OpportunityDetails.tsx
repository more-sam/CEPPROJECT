import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  MapPin,
  Route as RouteIcon,
  Sparkles,
  Target,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { CompanyLogo } from '../components/ui/CompanyLogo'
import { CompatibilityRing, scoreTone } from '../components/ui/CompatibilityRing'
import { ErrorState, InlineError } from '../components/ui/ErrorState'
import { SkeletonCard } from '../components/ui/LoadingSkeleton'
import { SkillChip } from '../components/ui/SkillChip'
import { useAsync } from '../hooks/useAsync'
import { getApiErrorMessage } from '../services/api'
import { isSafeExternalUrl } from '../utils/links'
import { getJob, getSimilarJobs } from '../services/jobs'
import { toggleSavedJob } from '../services/matching'
import { createRoadmap } from '../services/roadmap'
import type { OpportunityCard, SkillBreakdownEntry } from '../types'
import { useAuth } from '../store/authContext'

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

const IMPORTANCE_TONE: Record<string, 'danger' | 'warn' | 'neutral'> = {
  high: 'danger',
  medium: 'warn',
  low: 'neutral',
}

export default function OpportunityDetails() {
  const { jobId } = useParams<{ jobId: string }>()
  const numericId = Number(jobId)
  const navigate = useNavigate()
  const { status } = useAuth()
  const signedIn = status === 'authenticated'

  const jobState = useAsync(() => getJob(numericId), [numericId])
  const similarState = useAsync(() => getSimilarJobs(numericId, 3), [numericId])

  const [saved, setSaved] = useState<boolean | null>(null)
  const [savingJob, setSavingJob] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [buildingRoadmap, setBuildingRoadmap] = useState(false)

  const detail = jobState.data
  const isSaved = saved ?? detail?.is_saved ?? false

  if (!Number.isFinite(numericId)) {
    return <ErrorState message="That opportunity link is not valid." />
  }

  if (jobState.loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={6} />
      </div>
    )
  }

  if (jobState.error || !detail) {
    return (
      <ErrorState
        message={jobState.error ?? 'That opportunity could not be found.'}
        onRetry={jobState.reload}
      />
    )
  }

  const handleToggleSave = async () => {
    setSavingJob(true)
    setActionError(null)
    try {
      setSaved(await toggleSavedJob(numericId, isSaved))
    } catch (caught) {
      setActionError(getApiErrorMessage(caught))
    } finally {
      setSavingJob(false)
    }
  }

  const handleBuildRoadmap = async () => {
    setBuildingRoadmap(true)
    setActionError(null)
    try {
      const roadmap = await createRoadmap(numericId)
      navigate(`/roadmap?roadmap=${roadmap.id}`)
    } catch (caught) {
      setActionError(getApiErrorMessage(caught))
    } finally {
      setBuildingRoadmap(false)
    }
  }

  const matched = detail.skill_breakdown.filter((entry) => entry.matched)
  const missing = detail.skill_breakdown.filter((entry) => !entry.matched && entry.relation === 'missing')
  const semantic = detail.skill_breakdown.filter((entry) => entry.relation === 'semantic')

  return (
    <div className="space-y-6">
      <Link
        to="/opportunities"
        className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to opportunities
      </Link>

      {/* Header */}
      <section className="sb-glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <CompanyLogo
              companyName={detail.company.name}
              logoUrl={detail.company.logo_url}
              websiteUrl={detail.company.website_url}
              size={56}
            />
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold tracking-tight text-white">
                {detail.title}
              </h1>
              <p className="mt-1 text-sm text-slate-300">{detail.company.name}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <MapPin className="h-3 w-3" />
                  {detail.location}
                </span>
                <Badge tone="brand">
                  {EMPLOYMENT_LABEL[detail.employment_type] ?? detail.employment_type}
                </Badge>
                <Badge>{WORK_TYPE_LABEL[detail.work_type] ?? detail.work_type}</Badge>
                <Badge>{detail.experience_level}</Badge>
                <Badge tone="neutral">{detail.source}</Badge>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-3">
            <CompatibilityRing value={detail.compatibility_score} size={148} />
          </div>
        </div>

        {actionError && (
          <div className="mt-4">
            <InlineError message={actionError} />
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2.5">
          {isSafeExternalUrl(detail.application_url) ? (
            <a
              href={detail.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              Apply on company site
              <ExternalLink className="ml-1.5 inline h-4 w-4" />
            </a>
          ) : (
            <Button variant="ghost" disabled>
              Application link unavailable
            </Button>
          )}
          {signedIn && isSafeExternalUrl(detail.company.website_url) && (
            <a
              href={detail.company.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              Visit company website
              <ExternalLink className="ml-1.5 inline h-4 w-4" />
            </a>
          )}

          {signedIn ? (
            <>
              <Button
                variant="secondary"
                loading={savingJob}
                icon={
                  isSaved ? (
                    <BookmarkCheck className="h-4 w-4" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )
                }
                onClick={() => void handleToggleSave()}
              >
                {isSaved ? 'Saved' : 'Save'}
              </Button>
              <Button
                variant="secondary"
                loading={buildingRoadmap}
                icon={<RouteIcon className="h-4 w-4" />}
                onClick={() => void handleBuildRoadmap()}
              >
                Build my roadmap
              </Button>
            </>
          ) : (
            <Link to="/register">
              <Button variant="secondary">Sign in to save and track this role</Button>
            </Link>
          )}
        </div>
      </section>

      {/* Skills */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="sb-glass rounded-2xl p-5">
          <h2 className="inline-flex items-center gap-2 font-display text-sm font-semibold text-white">
            <Target className="h-4 w-4 text-emerald-400" />
            Skills you have ({matched.length})
          </h2>
          {matched.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              {signedIn
                ? 'No overlap with this role yet. Add skills or follow your roadmap to close the gap.'
                : 'Sign in to compare this role against your skills.'}
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {matched.map((entry) => (
                <SkillChip
                  key={entry.slug}
                  label={entry.skill}
                  state="matched"
                  detail={entry.importance}
                />
              ))}
            </div>
          )}

          {semantic.length > 0 && (
            <div className="mt-5 border-t border-white/8 pt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Related strengths (semantic)
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                These are not exact matches - they are counted at half weight during ranking
                only, never in the headline compatibility figure.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {semantic.map((entry) => (
                  <SkillChip key={entry.slug} label={entry.skill} state="learning" detail="related" />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sb-glass rounded-2xl p-5">
          <h2 className="inline-flex items-center gap-2 font-display text-sm font-semibold text-white">
            <Sparkles className="h-4 w-4 text-amber-300" />
            Skills to develop ({missing.length})
          </h2>
          {missing.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              You cover every required skill for this role.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {missing.map((entry: SkillBreakdownEntry) => (
                <li
                  key={entry.slug}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/4 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-200">{entry.skill}</p>
                    <p className="text-[11px] text-slate-500">{entry.category}</p>
                  </div>
                  <Badge tone={IMPORTANCE_TONE[entry.importance] ?? 'neutral'}>
                    {entry.importance}
                  </Badge>
                </li>
              ))}
            </ul>
          )}

          {missing.length > 0 && signedIn && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              icon={<RouteIcon className="h-4 w-4" />}
              loading={buildingRoadmap}
              onClick={() => void handleBuildRoadmap()}
            >
              Turn these gaps into a roadmap
            </Button>
          )}
        </div>
      </section>

      {/* Why this matches */}
      {detail.reasons.length > 0 && (
        <section className="sb-glass rounded-2xl p-5">
          <h2 className="font-display text-sm font-semibold text-white">
            Why this opportunity matches you
          </h2>
          <ul className="mt-3 space-y-1.5">
            {detail.reasons.map((reason, index) => (
              <li key={index} className="flex items-start gap-2 text-xs text-slate-400">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                {reason}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
            SkillBridge Compatibility measures how closely your skills align with this role's
            requirements. It is <strong className="text-slate-400">not</strong> a hiring
            probability or a prediction of selection.
          </p>
        </section>
      )}

      {/* Description */}
      <section className="sb-glass rounded-2xl p-5 sm:p-6">
        <h2 className="font-display text-sm font-semibold text-white">About this role</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">
          {detail.description}
        </p>

        {detail.requirements_text && (
          <>
            <h3 className="mt-5 font-display text-sm font-semibold text-white">Requirements</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-400">
              {detail.requirements_text}
            </p>
          </>
        )}

        {detail.company.description && (
          <div className="mt-5 rounded-xl border border-white/8 bg-white/4 p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              About {detail.company.name}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              {detail.company.description}
            </p>
          </div>
        )}
      </section>

      {/* Scores */}
      {signedIn && detail.compatibility_score !== null && (
        <section className="sb-glass rounded-2xl p-5">
          <h2 className="font-display text-sm font-semibold text-white">
            How the score is built
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-slate-500">
                Compatibility (headline)
              </dt>
              <dd className={`mt-1 font-display text-lg font-semibold ${scoreTone(detail.compatibility_score).text}`}>
                {detail.compatibility_score.toFixed(1)}%
              </dd>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Exact matched skills ÷ required skills
              </p>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-slate-500">
                Weighted score
              </dt>
              <dd className="mt-1 font-display text-lg font-semibold text-slate-200">
                {detail.weighted_score?.toFixed(1) ?? '—'}%
              </dd>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Credits high-importance skills more
              </p>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-slate-500">
                Semantic score
              </dt>
              <dd className="mt-1 font-display text-lg font-semibold text-slate-200">
                {detail.semantic_score?.toFixed(1) ?? '—'}%
              </dd>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Related skills, discounted and ranking-only
              </p>
            </div>
          </dl>
        </section>
      )}

      {/* Similar */}
      {similarState.data && similarState.data.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-sm font-semibold text-white">
            Similar opportunities
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {similarState.data.map((item: OpportunityCard) => (
              <Link
                key={item.id}
                to={`/opportunities/${item.id}`}
                className="sb-glass flex items-center gap-3 rounded-2xl p-4 transition hover:border-brand-400/25"
              >
                <CompanyLogo
                  companyName={item.company.name}
                  logoUrl={item.company.logo_url}
                  websiteUrl={item.company.website_url}
                  size={36}
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-200">{item.title}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {item.company.name} · {item.location}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
