import {
  Compass,
  FileText,
  Layers,
  Route,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { CompaniesMatchingSkills } from '../components/opportunities/CompaniesMatchingSkills'
import { OpenOpportunities } from '../components/opportunities/OpenOpportunities'
import { OpportunityCard } from '../components/opportunities/OpportunityCard'
import { SkillNetwork } from '../components/skills/SkillNetwork'
import { Button } from '../components/ui/Button'
import { ChartCard } from '../components/ui/ChartCard'
import { CompatibilityRing } from '../components/ui/CompatibilityRing'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { MetricCard } from '../components/ui/MetricCard'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { SkeletonCard, SkeletonMetrics } from '../components/ui/LoadingSkeleton'
import { useAsync } from '../hooks/useAsync'
import { getApiErrorMessage } from '../services/api'
import { toggleSavedJob } from '../services/matching'
import { fetchDashboard } from '../services/progress'

const METRIC_ICONS = [Layers, Compass, Target, TrendingUp]

const ACTIVITY_ICONS: Record<string, typeof FileText> = {
  resume: FileText,
  assessment: Target,
  roadmap: Route,
  saved_job: Compass,
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function Dashboard() {
  const { data, loading, error, reload, setData } = useAsync(fetchDashboard, [])
  const [savingId, setSavingId] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleToggleSave = async (jobId: number, nextSaved: boolean) => {
    setSavingId(jobId)
    setSaveError(null)
    try {
      await toggleSavedJob(jobId, !nextSaved)
      // Reflect the change locally instead of refetching the whole dashboard.
      setData(
        data
          ? {
              ...data,
              recommendations: data.recommendations.map((item) =>
                item.id === jobId ? { ...item, is_saved: nextSaved } : item,
              ),
            }
          : null,
      )
    } catch (caught) {
      setSaveError(getApiErrorMessage(caught))
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonMetrics />
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={5} />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'The dashboard could not be loaded.'} onRetry={reload} />
  }

  const pendingSteps = data.onboarding_steps.filter((step) => !step.done)
  const categoryData = data.skills_by_category.map((entry) => ({
    category: entry.category,
    count: entry.count,
  }))

  return (
    <div className="space-y-7">
      <PageHeader
        title={`Good to see you, ${data.greeting_name}.`}
        subtitle="Here's your career intelligence overview."
        actions={
          <Link to="/assistant">
            <Button variant="secondary" size="sm" icon={<Sparkles className="h-4 w-4" />}>
              Ask the career assistant
            </Button>
          </Link>
        }
      />

      {/* Onboarding checklist until the profile has real content. */}
      {pendingSteps.length > 0 && (
        <section className="sb-glass rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-white">
                Set up your profile
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {data.onboarding_steps.length - pendingSteps.length} of{' '}
                {data.onboarding_steps.length} steps complete
              </p>
            </div>
            <ProgressBar
              value={data.onboarding_steps.length - pendingSteps.length}
              max={data.onboarding_steps.length}
              className="w-full sm:w-48"
              showLabel
            />
          </div>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {data.onboarding_steps.map((step) => (
              <li
                key={step.key}
                className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-xs"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    step.done ? 'bg-emerald-400' : 'bg-slate-600'
                  }`}
                  aria-hidden="true"
                />
                <span className={step.done ? 'text-slate-400 line-through' : 'text-slate-300'}>
                  {step.label}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link to="/profile">
              <Button variant="secondary" size="sm">
                Complete profile
              </Button>
            </Link>
            <Link to="/resume">
              <Button size="sm" icon={<FileText className="h-4 w-4" />}>
                Upload resume
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Metrics */}
      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric, index) => (
          <MetricCard
            key={metric.label}
            icon={METRIC_ICONS[index] ?? TrendingUp}
            label={metric.label}
            value={metric.value}
            suffix={metric.suffix}
            hint={metric.hint}
          />
        ))}
      </section>

      {/* Compatibility + constellation */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <ChartCard
          title="SkillBridge Compatibility"
          subtitle="Average across your recommended roles"
        >
          <div className="flex flex-col items-center gap-4 py-2">
            <CompatibilityRing value={data.average_compatibility} size={168} />
            <p className="text-center text-[11px] leading-relaxed text-slate-500">
              How closely your identified skills align with the roles below. This is a
              skill-alignment indicator, <strong className="text-slate-400">not</strong> a
              hiring probability.
            </p>
          </div>
        </ChartCard>

        <ChartCard
          title="Skill constellation"
          subtitle="Owned, learning and gap skills across your target roles"
        >
          <SkillNetwork nodes={data.skill_constellation} />
        </ChartCard>
      </section>

      {/* Recommended opportunities */}
      <section>
        <header className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Recommended opportunities
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Ranked by skill alignment, your preferences and recency.
            </p>
          </div>
          <Link to="/opportunities" className="text-xs font-medium text-brand-300 hover:text-brand-200">
            View all
          </Link>
        </header>

        {saveError && (
          <p role="alert" className="mb-3 text-xs text-rose-300">
            {saveError}
          </p>
        )}

        {data.recommendation_note && data.recommendations.length === 0 && (
          <EmptyState
            icon={Compass}
            title="No matches yet"
            description={data.recommendation_note}
            action={
              <Link to="/resume">
                <Button icon={<FileText className="h-4 w-4" />}>Upload resume</Button>
              </Link>
            }
          />
        )}

        {data.recommendations.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.recommendations.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                onToggleSave={(jobId, nextSaved) => void handleToggleSave(jobId, nextSaved)}
                busy={savingId === opportunity.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Matching employers + the roles they have open. */}
      <CompaniesMatchingSkills
        companyLimit={6}
        opportunityLimit={3}
        title="Companies with Matching Roles"
        subtitle="Employers whose listings align with your skills, and a few of their open roles."
      />

      {/* Prominently: only rows the database stores as open. */}
      <OpenOpportunities limit={6} />

      {/* Roadmap preview + activity */}
      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Learning roadmap"
          subtitle={
            data.roadmap_progress_percentage > 0
              ? `${data.roadmap_progress_percentage.toFixed(0)}% complete`
              : 'Your next steps'
          }
          action={
            <Link to="/roadmap" className="text-xs font-medium text-brand-300 hover:text-brand-200">
              Open
            </Link>
          }
        >
          {data.roadmap_preview.length === 0 ? (
            <p className="rounded-xl border border-white/8 bg-white/4 px-3 py-6 text-center text-xs text-slate-500">
              No roadmap yet. Analyse an opportunity to generate a personalised path.
            </p>
          ) : (
            <ol className="space-y-2.5">
              {data.roadmap_preview.map((item, index) => (
                <li key={item.id} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500/12 text-[10px] font-semibold text-brand-200 ring-1 ring-brand-400/20">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-200">{item.skill}</p>
                    <p className="truncate text-[11px] text-slate-500">{item.reason}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-500">
                    {item.status.replace('_', ' ')}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </ChartCard>

        <ChartCard title="Recent activity" subtitle="Your latest actions and results">
          {data.recent_activity.length === 0 ? (
            <p className="rounded-xl border border-white/8 bg-white/4 px-3 py-6 text-center text-xs text-slate-500">
              Nothing here yet. Upload a resume to get started.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.recent_activity.map((event, index) => {
                const Icon = ACTIVITY_ICONS[event.kind] ?? TrendingUp
                return (
                  <li key={`${event.kind}-${index}`} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/6 text-slate-300 ring-1 ring-white/10">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-200">{event.title}</p>
                      <p className="truncate text-[11px] text-slate-500">
                        {event.detail} · {formatWhen(event.occurred_at)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </ChartCard>
      </section>

      {/* Skills by category + saved */}
      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Skills by category" subtitle="Where your current strengths sit">
          {categoryData.length === 0 ? (
            <p className="rounded-xl border border-white/8 bg-white/4 px-3 py-8 text-center text-xs text-slate-500">
              No skills yet.
            </p>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="category"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#0c1226',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Saved opportunities"
          subtitle="Roles you bookmarked"
          action={
            <Link to="/opportunities" className="text-xs font-medium text-brand-300 hover:text-brand-200">
              Browse
            </Link>
          }
        >
          {data.saved_jobs.length === 0 ? (
            <p className="rounded-xl border border-white/8 bg-white/4 px-3 py-6 text-center text-xs text-slate-500">
              You have not saved any opportunities yet.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {data.saved_jobs.map((job) => (
                <li key={job.id}>
                  <Link
                    to={`/opportunities/${job.id}`}
                    className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 transition hover:border-brand-400/25"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-ink-700 to-ink-850 text-[10px] font-semibold text-brand-200 ring-1 ring-white/10">
                      {job.company_initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-200">{job.title}</p>
                      <p className="truncate text-[11px] text-slate-500">
                        {job.company} · {job.location}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </section>
    </div>
  )
}
