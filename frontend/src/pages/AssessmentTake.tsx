import { ArrowLeft, ArrowRight, Check, RotateCcw, Send, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { CompatibilityRing } from '../components/ui/CompatibilityRing'
import { ErrorState, InlineError } from '../components/ui/ErrorState'
import { SkeletonCard } from '../components/ui/LoadingSkeleton'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Reveal, Stagger, StaggerItem } from '../motion/Reveal'
import { useAsync } from '../hooks/useAsync'
import { ease } from '../motion/tokens'
import { getApiErrorMessage } from '../services/api'
import { getAssessment, submitAssessment } from '../services/assessments'
import type { AssessmentResult } from '../types'

export default function AssessmentTake() {
  const reduced = useReducedMotion()
  const { assessmentId } = useParams<{ assessmentId: string }>()
  const numericId = Number(assessmentId)

  const assessmentState = useAsync(() => getAssessment(numericId), [numericId])

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!Number.isFinite(numericId)) {
    return <ErrorState message="That assessment link is not valid." />
  }

  if (assessmentState.loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={5} />
      </div>
    )
  }

  if (assessmentState.error || !assessmentState.data) {
    return (
      <ErrorState
        message={assessmentState.error ?? 'That assessment could not be found.'}
        onRetry={assessmentState.reload}
      />
    )
  }

  const assessment = assessmentState.data
  const questions = assessment.questions
  const answeredCount = Object.keys(answers).length

  // ---------------------------------------------------------------------------
  // Result view
  // ---------------------------------------------------------------------------
  if (result) {
    const correct = result.review.filter((item) => item.is_correct).length
    return (
      <div className="space-y-6">
        <Link
          to="/assessments"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to assessments
        </Link>

        <Reveal amount={0.12}>
          <div className="sb-glass rounded-2xl p-6">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
              <CompatibilityRing value={result.score} size={150} label="Your score" />
              <div className="flex-1">
                <h1 className="font-display text-xl font-semibold text-white">
                  {result.assessment_title}
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  {correct} of {result.total_count} correct · pass mark {result.pass_score}%
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <motion.span
                    initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.86 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.22, ease: ease.out }}
                  >
                    {result.passed ? (
                      <Badge tone="success">Passed</Badge>
                    ) : (
                      <Badge tone="warn">Not passed yet</Badge>
                    )}
                  </motion.span>
                  {result.progress_updated && (
                    <motion.span
                      initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.86 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.08, duration: 0.22, ease: ease.out }}
                    >
                      <Badge tone="brand">
                        {result.skill_name} progress · {result.progress_percentage}%
                      </Badge>
                    </motion.span>
                  )}
                  {result.new_skills_added.map((skill, idx) => (
                    <motion.span
                      key={skill}
                      initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.86 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.14 + idx * 0.06, duration: 0.22, ease: ease.out }}
                    >
                      <Badge tone="aqua">{skill} added to profile</Badge>
                    </motion.span>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-2.5">
                  <Link to="/progress">
                    <Button variant="secondary">View progress</Button>
                  </Link>
                  <Link to="/assessments">
                    <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />}>
                      Retake another
                    </Button>
                  </Link>
                  <Link to="/roadmap">
                    <Button>Continue roadmap</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal amount={0.1} delay={0.06}>
          <h2 className="font-display text-sm font-semibold text-white">Answer review</h2>
        </Reveal>
        <Stagger className="space-y-3" step={0.05} amount={0.1} lead={0.08}>
          {result.review.map((item, index) => (
            <StaggerItem
              key={item.question_id}
              className={`sb-glass rounded-2xl p-4 ${
                item.is_correct ? 'ring-1 ring-emerald-400/20' : 'ring-1 ring-rose-400/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                    item.is_correct
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-rose-500/15 text-rose-300'
                  }`}
                >
                  {item.is_correct ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200">
                    {index + 1}. {item.question}
                  </p>

                  <div className="mt-2 space-y-1 text-[11px]">
                    <p className="text-slate-400">
                      Your answer:{' '}
                      <span className={item.is_correct ? 'text-emerald-300' : 'text-rose-300'}>
                        {item.given || 'No answer'}
                      </span>
                    </p>
                    {!item.is_correct && (
                      <p className="text-slate-400">
                        Correct answer: <span className="text-emerald-300">{item.correct}</span>
                      </p>
                    )}
                  </div>

                  {item.explanation && (
                    <p className="mt-2 rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-[11px] leading-relaxed text-slate-400">
                      {item.explanation}
                    </p>
                  )}
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Question view
  // ---------------------------------------------------------------------------
  const question = questions[current]
  const selected = answers[question.id]
  const isLast = current === questions.length - 1

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      setResult(await submitAssessment(numericId, answers))
    } catch (caught) {
      setError(getApiErrorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  const questionKey = `q-${current}`

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to="/assessments"
        className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Exit assessment
      </Link>

      <header>
        <h1 className="font-display text-xl font-semibold text-white">
          {assessment.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <Badge tone="brand">{assessment.skill_name}</Badge>
          <Badge>{assessment.difficulty}</Badge>
          <span>
            Question {current + 1} of {questions.length}
          </span>
        </div>
        <ProgressBar
          className="mt-3"
          value={current + 1}
          max={questions.length}
          tone="aqua"
        />
      </header>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: ease.out }}
          >
            <InlineError message={error} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.section
          key={questionKey}
          className="sb-glass rounded-2xl p-5 sm:p-6"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.22, ease: ease.out }}
        >
        <p className="font-display text-base font-medium leading-relaxed text-white">
          {question.question}
        </p>

        <ul className="mt-5 space-y-2.5">
          {question.options.map((option) => {
            const active = selected === option
            return (
              <li key={option}>
                <motion.button
                  type="button"
                  onClick={() => setAnswers({ ...answers, [question.id]: option })}
                  aria-pressed={active}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.12, ease: ease.out }}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm ${
                    active
                      ? 'border-brand-400/40 bg-brand-500/12 text-white'
                      : 'border-white/10 bg-white/4 text-slate-300 hover:border-white/20 hover:bg-white/8'
                  }`}
                >
                  <motion.span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                      active ? 'border-brand-300 bg-brand-400 text-ink-950' : 'border-white/20'
                    }`}
                    animate={active ? { scale: 1.06 } : { scale: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                  >
                    <AnimatePresence>
                      {active && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                        >
                          <Check className="h-3 w-3" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.span>
                  {option}
                </motion.button>
              </li>
            )
          })}
        </ul>
        </motion.section>
      </AnimatePresence>

      <nav className="flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          disabled={current === 0}
          icon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => setCurrent((index) => Math.max(0, index - 1))}
        >
          Previous
        </Button>

        <span className="text-[11px] text-slate-500">
          {answeredCount} of {questions.length} answered
        </span>

        {isLast ? (
          <Button
            loading={submitting}
            icon={<Send className="h-4 w-4" />}
            onClick={() => void handleSubmit()}
          >
            Submit
          </Button>
        ) : (
          <Button
            icon={<ArrowRight className="h-4 w-4" />}
            onClick={() => setCurrent((index) => Math.min(questions.length - 1, index + 1))}
          >
            Next
          </Button>
        )}
      </nav>

      {/* Jump grid so a student can revisit skipped questions. */}
      <div className="sb-glass rounded-2xl p-4">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Jump to question
        </p>
        <div className="flex flex-wrap gap-1.5">
          {questions.map((item, index) => {
            const done = Boolean(answers[item.id])
            return (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => setCurrent(index)}
                aria-label={`Go to question ${index + 1}${done ? ' (answered)' : ''}`}
                whileTap={{ scale: 0.9 }}
                className={`grid h-8 w-8 place-items-center rounded-lg text-[11px] font-medium transition ${
                  index === current
                    ? 'bg-brand-500/25 text-brand-100 ring-1 ring-brand-400/40'
                    : done
                      ? 'bg-emerald-500/15 text-emerald-200'
                      : 'bg-white/6 text-slate-400 hover:bg-white/10'
                }`}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                {index + 1}
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
