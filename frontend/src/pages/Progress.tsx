import { Award, Clock, Target, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ChartCard } from '../components/ui/ChartCard'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { SkeletonCard, SkeletonMetrics } from '../components/ui/LoadingSkeleton'
import { MetricCard } from '../components/ui/MetricCard'
import { PageHeader } from '../components/ui/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { getApiErrorMessage } from '../services/api'
import { fetchProgressOverview, setSkillProgress } from '../services/progress'
import type { ProgressItem } from '../types'

const CATEGORY_COLORS = ['#34d399', '#818cf8', '#fbbf24', '#22d3ee', '#fb7185']

const STATUS_TONE: Record<string, 'success' | 'brand' | 'neutral'> = {
  mastered: 'success',
  developing: 'brand',
  not_started: 'neutral',
}

function ProgressRow({
  item,
  onSaved,
}: {
  item: ProgressItem
  onSaved: () => void
}) {
  const [draft, setDraft] = useState(item.progress_percentage)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = draft !== item.progress_percentage

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await setSkillProgress(item.skill_id, draft)
      onSaved()
    } catch (caught) {
      setError(getApiErrorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="rounded-xl border border-white/8 bg-white/4 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-200">{item.skill_name}</p>
          <p className="text-[11px] text-slate-500">
            {item.category}
            {item.best_assessment_score !== null
              ? ` · best assessment ${item.best_assessment_score.toFixed(0)}%`
              : ''}
          </p>
        </div>
        <Badge tone={STATUS_TONE[item.status] ?? 'neutral'}>
          {item.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="mt-2.5 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={draft}
          aria-label={`Progress for ${item.skill_name}`}
          onChange={(event) => setDraft(Number(event.target.value))}
          className="flex-1 accent-brand-500"
        />
        <span className="w-10 text-right text-xs text-slate-300">{draft}%</span>
        <Button size="sm" variant="secondary" disabled={!dirty} loading={saving} onClick={() => void save()}>
          Save
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-1.5 text-[11px] text-rose-300">
          {error}
        </p>
      )}
    </li>
  )
}

export default function Progress() {
  const { data, loading, error, reload } = useAsync(fetchProgressOverview, [])
  const [filter, setFilter] = useState<'all' | 'mastered' | 'developing' | 'not_started'>('all')

  if (loading) {
    return (
      <div className="space-y-5">
        <SkeletonMetrics />
        <SkeletonCard lines={5} />
      </div>
    )
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'Progress could not be loaded.'} onRetry={reload} />
  }

  const filteredItems =
    filter === 'all' ? data.items : data.items.filter((item) => item.status === filter)

  const categorySeries = data.category_breakdown.map((entry, index) => ({
    ...entry,
    fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress"
        subtitle="Assessments, roadmap completion and skill development in one view."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Target}
          label="Skills mastered"
          value={data.mastered}
          hint={`${data.total_skills} skill${data.total_skills === 1 ? '' : 's'} tracked`}
        />
        <MetricCard
          icon={TrendingUp}
          label="Roadmap progress"
          value={data.roadmap_progress_percentage}
          suffix="%"
          hint={`${data.roadmap_items_completed} of ${data.roadmap_items_total} steps`}
        />
        <MetricCard
          icon={Award}
          label="Average score"
          value={data.average_assessment_score}
          suffix="%"
          hint={`${data.assessments_passed} of ${data.assessments_taken} passed`}
        />
        <MetricCard
          icon={Clock}
          label="Learning hours"
          value={data.completed_learning_hours}
          hint={`${data.total_learning_hours}h planned`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Assessment performance"
          subtitle="Your score on each completed attempt"
        >
          {data.score_history.length === 0 ? (
            <p className="rounded-xl border border-white/8 bg-white/4 px-3 py-8 text-center text-xs text-slate-500">
              Take an assessment to start building your performance history.
            </p>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.score_history}
                  margin={{ top: 6, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={48}
                  />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#0c1226',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#22d3ee' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Skills by category"
          subtitle="Mastered, developing and not started"
        >
          {categorySeries.length === 0 ? (
            <p className="rounded-xl border border-white/8 bg-white/4 px-3 py-8 text-center text-xs text-slate-500">
              No category data yet.
            </p>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categorySeries}
                  margin={{ top: 6, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="category"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={48}
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
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="mastered" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="developing" stackId="a" fill="#818cf8" />
                  <Bar dataKey="not_started" stackId="a" fill="#475569" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </section>

      <section className="sb-glass rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-sm font-semibold text-white">Skill progress</h2>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'mastered', 'developing', 'not_started'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                  filter === value
                    ? 'bg-brand-500/20 text-brand-200 ring-1 ring-brand-400/30'
                    : 'border border-white/10 bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {value === 'all' ? 'All' : value.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {data.items.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={TrendingUp}
            title="Nothing to track yet"
            description="Generate a roadmap or take an assessment and your skill progress will appear here."
          />
        ) : filteredItems.length === 0 ? (
          <p className="mt-4 text-xs text-slate-500">No skills in this state.</p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {filteredItems.map((item) => (
              <ProgressRow key={item.skill_id} item={item} onSaved={reload} />
            ))}
          </ul>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
          Progress is a learning signal, not a competency certification. It rises from
          completing roadmap steps and passing assessments.
        </p>
      </section>
    </div>
  )
}
