import {
  Compass,
  FileText,
  Layers,
  Route,
  Sparkles,
  Target,
  TrendingUp,
  Clock,
  Briefcase,
  ArrowRight,
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
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { SkeletonCard, SkeletonMetrics } from '../components/ui/LoadingSkeleton'
import { Reveal, Stagger, StaggerItem } from '../motion/Reveal'
import { useAsync } from '../hooks/useAsync'
import { getApiErrorMessage } from '../services/api'
import { toggleSavedJob } from '../services/matching'
import { fetchDashboard } from '../services/progress'

const ACTIVITY_ICONS: Record<string, typeof FileText> = {
  resume: FileText,
  assessment: Target,
  roadmap: Route,
  saved_job: Compass,
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
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
      <div className="space-y-6 animate-fade-in">
        <SkeletonMetrics />
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={5} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
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

  // Build metrics from dashboard data
  const metrics = [
    { label: 'Skills Identified', value: data.skills_identified, suffix: '', hint: 'Extracted from your resume', icon: Layers, id: 'skills' },
    { label: 'Matching Opportunities', value: data.opportunities_matched, suffix: '', hint: 'Roles aligned with your skills', icon: Briefcase, id: 'opportunities' },
    { label: 'Skill Gaps', value: data.skill_gaps, suffix: '', hint: 'Skills to develop for your targets', icon: Target, id: 'gaps' },
    { label: 'Roadmap Progress', value: Math.round(data.roadmap_progress_percentage), suffix: '%', hint: 'Completion of your learning path', icon: Route, id: 'roadmap' },
  ]

  return (
    <div className="space-y-7">
      {/* Page Header */}
      <Reveal amount={0.14}>
        <PageHeader
          title={`Good to see you, ${data.greeting_name}.`}
          subtitle="Here's your career intelligence overview."
          actions={
            <Link to="/assistant">
              <Button variant="secondary" size="sm" icon={<Sparkles className="h-4 w-4" />}>
                Ask Career AI
              </Button>
            </Link>
          }
        />
      </Reveal>

      {/* Onboarding Progress */}
      {pendingSteps.length > 0 && (
        <Reveal amount={0.14} delay={0.06}>
          <div className="sb-glass rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-semibold text-white">Set up your profile</h2>
                <p className="mt-0.5 text-xs text-text-muted">
                  {data.onboarding_steps.length - pendingSteps.length} of {data.onboarding_steps.length} steps complete
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
                <li key={step.key} className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-elevated/30 px-3 py-2 text-xs">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${step.done ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}
                    aria-hidden="true"
                  />
                  <span className={step.done ? 'text-text-muted line-through' : 'text-text-secondary'}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link to="/profile">
                <Button variant="secondary" size="sm">Complete profile</Button>
              </Link>
              <Link to="/resume">
                <Button size="sm" icon={<FileText className="h-4 w-4" />}>Upload resume</Button>
              </Link>
            </div>
          </div>
        </Reveal>
      )}

      {/* Key Metrics — staggered so each counter lands in turn. */}
      <Stagger aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" step={0.07} amount={0.14}>
        {metrics.map((metric) => (
          <StaggerItem key={metric.id} className="sb-metric relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{metric.label}</p>
                <p className="mt-1 font-display text-2xl font-semibold text-white tabular-nums">
                  {metric.value}{metric.suffix}
                </p>
                <p className="mt-1 text-[11px] text-text-muted">{metric.hint}</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/20">
                <metric.icon className="h-6 w-6" />
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      {/* Compatibility Panel + Skill Constellation */}
      <Reveal amount={0.12}>
        <section className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
          <ChartCard
            title="SkillBridge Compatibility"
            subtitle="Average across your recommended roles"
            className="h-full"
          >
            <div className="flex flex-col items-center gap-4 py-2">
              <CompatibilityRing value={data.average_compatibility} size={168} strokeWidth={8} />
              <p className="text-center text-[11px] leading-relaxed text-text-muted">
                How closely your identified skills align with the roles below. This is a
                skill-alignment indicator, <strong className="text-text-secondary">not</strong> a
                hiring probability.
              </p>
            </div>
          </ChartCard>

          <ChartCard
            title="Skill Constellation"
            subtitle="Owned, learning and gap skills across your target roles"
            className="h-full"
          >
            <SkillNetwork nodes={data.skill_constellation} />
          </ChartCard>
        </section>
      </Reveal>

      {/* Recommended Opportunities — staggered cards with hover lift. */}
      <Reveal amount={0.1}>
        <section>
          <header className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-white">Recommended Opportunities</h2>
              <p className="mt-0.5 text-xs text-text-muted">
                Ranked by skill alignment, your preferences and recency.
              </p>
            </div>
            <Link to="/opportunities" className="text-xs font-medium text-brand-300 hover:text-brand-200 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </header>

          {saveError && (
            <p role="alert" className="mb-3 text-xs text-rose-300 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> {saveError}
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
            <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" step={0.06} amount={0.1}>
              {data.recommendations.map((opportunity) => (
                <StaggerItem key={opportunity.id} as="article">
                  <OpportunityCard
                    opportunity={opportunity}
                    onToggleSave={(jobId, nextSaved) => void handleToggleSave(jobId, nextSaved)}
                    busy={savingId === opportunity.id}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </section>
      </Reveal>

      {/* Matching Companies + Open Opportunities */}
      <Reveal amount={0.1} delay={0.04}>
        <CompaniesMatchingSkills
          companyLimit={6}
          opportunityLimit={3}
          title="Companies with Matching Roles"
          subtitle="Employers whose listings align with your skills, and a few of their open roles."
          eyebrow="Active Intelligence"
        />
      </Reveal>

      {/* Prominently: Open Opportunities */}
      <Reveal amount={0.1} delay={0.06}>
        <OpenOpportunities limit={6} />
      </Reveal>

      {/* Roadmap + Activity */}
      <Reveal amount={0.1} delay={0.08}>
        <section className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Learning Roadmap"
            subtitle={
              data.roadmap_progress_percentage > 0
                ? `${data.roadmap_progress_percentage.toFixed(0)}% complete`
                : 'Your next steps'
            }
            action={
              <Link to="/roadmap" className="text-xs font-medium text-brand-300 hover:text-brand-200">
                Open Roadmap
              </Link>
            }
          >
            {data.roadmap_preview.length === 0 ? (
              <p className="rounded-xl border border-surface-border bg-surface-elevated/30 px-3 py-6 text-center text-xs text-text-muted">
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
                      <p className="truncate text-xs font-medium text-white">{item.skill}</p>
                      <p className="truncate text-[11px] text-text-muted">{item.reason}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-text-muted sb-badge-neutral">
                      {item.status.replace('_', ' ')}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </ChartCard>

          <ChartCard title="Recent Activity" subtitle="Your latest actions and results">
            {data.recent_activity.length === 0 ? (
              <p className="rounded-xl border border-surface-border bg-surface-elevated/30 px-3 py-6 text-center text-xs text-text-muted">
                Nothing here yet. Upload a resume to get started.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.recent_activity.map((event, index) => {
                  const Icon = ACTIVITY_ICONS[event.kind] ?? TrendingUp
                  return (
                    <li key={`${event.kind}-${index}`} className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-overlay text-text-secondary ring-1 ring-surface-border">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-white">{event.title}</p>
                        <p className="truncate text-[11px] text-text-muted">
                          {event.detail} · {formatWhen(event.occurred_at)}
                        </p>
                      </div>
                      <Clock className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                    </li>
                  )
                })}
              </ul>
            )}
          </ChartCard>
        </section>
      </Reveal>

      {/* Skills by Category + Saved Opportunities */}
      <Reveal amount={0.1} delay={0.1}>
        <section className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Skills by Category" subtitle="Where your current strengths sit">
            {categoryData.length === 0 ? (
              <p className="rounded-xl border border-surface-border bg-surface-elevated/30 px-3 py-8 text-center text-xs text-text-muted">
                No skills yet.
              </p>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
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
                        border: '1px solid rgba(255,255,255,0.08)',
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
            title="Saved Opportunities"
            subtitle="Roles you bookmarked"
            action={
              <Link to="/opportunities" className="text-xs font-medium text-brand-300 hover:text-brand-200">
                Browse
              </Link>
            }
          >
            {data.saved_jobs.length === 0 ? (
              <p className="rounded-xl border border-surface-border bg-surface-elevated/30 px-3 py-6 text-center text-xs text-text-muted">
                You have not saved any opportunities yet.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {data.saved_jobs.map((job) => (
                  <li key={job.id}>
                    <Link
                      to={`/opportunities/${job.id}`}
                      className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-elevated/30 px-3 py-2.5 transition hover:border-brand-500/30 hover:bg-surface-elevated/60"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-overlay text-[10px] font-semibold text-brand-200 ring-1 ring-surface-border">
                        {job.company_initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-white">{job.title}</p>
                        <p className="truncate text-[11px] text-text-muted">
                          {job.company} · {job.location}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>
        </section>
      </Reveal>
    </div>
  )
}
