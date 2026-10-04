import { ClipboardCheck, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'

import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { SkeletonGrid } from '../components/ui/LoadingSkeleton'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useAsync } from '../hooks/useAsync'
import { Reveal, Stagger, StaggerItem } from '../motion/Reveal'
import { fetchAssessmentHistory, listAssessments } from '../services/assessments'
import type { AssessmentSummary } from '../types'
import { ease } from '../motion/tokens'

const DIFFICULTY_TONE: Record<string, 'success' | 'warn' | 'danger'> = {
  beginner: 'success',
  intermediate: 'warn',
  advanced: 'danger',
}

function AssessmentCard({ assessment }: { assessment: AssessmentSummary }) {
  const reduced = useReducedMotion()
  const best = assessment.best_score

  return (
    <motion.article
      className="sb-glass flex flex-col gap-3 rounded-2xl p-5"
      whileHover={reduced ? undefined : { y: -3, scale: 1.01 }}
      whileTap={reduced ? undefined : { scale: 0.992 }}
      transition={{ duration: 0.22, ease: ease.out }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold text-white">{assessment.title}</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            {assessment.skill_name} · {assessment.skill_category}
          </p>
        </div>
        <Badge tone={DIFFICULTY_TONE[assessment.difficulty] ?? 'neutral'}>{assessment.difficulty}</Badge>
      </div>

      {assessment.description && (
        <p className="text-[11px] leading-relaxed text-slate-500">{assessment.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span>{assessment.question_count} questions</span>
        <span>·</span>
        <span>Pass at {assessment.pass_score}%</span>
      </div>

      {best !== null ? (
        <div className="rounded-xl border border-white/8 bg-white/4 p-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <Trophy className="h-3.5 w-3.5 text-amber-300" />
              Best score
            </span>
            <span className={assessment.passed ? 'text-emerald-300' : 'text-amber-300'}>
              {best.toFixed(0)}%
            </span>
          </div>
          <ProgressBar className="mt-2" value={best} tone={assessment.passed ? 'success' : 'brand'} />
          <p className="mt-1.5 text-[10px] text-slate-500">
            {assessment.attempts} attempt{assessment.attempts === 1 ? '' : 's'}
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">Not attempted yet.</p>
      )}

      <Link to={`/assessments/${assessment.id}`} className="mt-auto">
        <Button fullWidth size="sm" variant={best === null ? 'primary' : 'secondary'}>
          {best === null ? 'Start assessment' : 'Retake assessment'}
        </Button>
      </Link>
    </motion.article>
  )
}

export default function Assessments() {
  const assessments = useAsync(listAssessments, [])
  const history = useAsync(fetchAssessmentHistory, [])

  if (assessments.loading) {
    return (
      <div className="space-y-4">
        <SkeletonGrid count={6} />
      </div>
    )
  }

  if (assessments.error) {
    return <ErrorState message={assessments.error} onRetry={assessments.reload} />
  }

  const items = assessments.data ?? []
  const attempts = history.data ?? []
  const passed = items.filter((item) => item.passed).length

  return (
    <div className="space-y-6">
      <Reveal amount={0.14}>
        <PageHeader
          title="Assessments"
          subtitle="Short, scored quizzes that turn roadmap progress into evidence."
        />
      </Reveal>

      {items.length === 0 ? (
        <Reveal>
          <EmptyState
            icon={ClipboardCheck}
            title="No assessments available"
            description="Assessments are seeded with the demo data. Once available they appear here."
          />
        </Reveal>
      ) : (
        <>
          <Reveal amount={0.12} delay={0.06}>
            <div className="sb-glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
              <div>
                <h2 className="font-display text-sm font-semibold text-white">
                  {passed} of {items.length} skills passed
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Passing an assessment marks the skill as mastered and advances your progress.
                </p>
              </div>
              <ProgressBar value={passed} max={items.length} className="w-full sm:w-56" tone="success" showLabel />
            </div>
          </Reveal>

          <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" step={0.06} amount={0.1} lead={0.08}>
            {items.map((assessment: AssessmentSummary) => (
              <StaggerItem key={assessment.id} as="article">
                <AssessmentCard assessment={assessment} />
              </StaggerItem>
            ))}
          </Stagger>
        </>
      )}

      <Reveal delay={0.12}>
        <div className="sb-glass rounded-2xl p-5">
          <h2 className="font-display text-sm font-semibold text-white">Recent attempts</h2>
          {history.loading ? (
            <p className="mt-2 text-xs text-slate-500">Loading…</p>
          ) : attempts.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">You have not taken any assessments yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/6">
              {attempts.slice(0, 8).map((attempt, idx) => (
                <motion.li
                  key={attempt.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.22, ease: ease.out }}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-200">{attempt.assessment_title}</p>
                    <p className="text-[11px] text-slate-500">{new Date(attempt.completed_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {attempt.passed ? <Badge tone="success">Passed</Badge> : <Badge tone="warn">Attempted</Badge>}
                    <span className="w-12 text-right text-xs font-medium text-slate-300">
                      {attempt.score.toFixed(0)}%
                    </span>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </Reveal>
    </div>
  )
}
