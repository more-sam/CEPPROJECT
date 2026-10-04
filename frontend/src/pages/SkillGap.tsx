import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, CircleDot, Route as RouteIcon, Target } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { SkillNetwork } from '../components/skills/SkillNetwork'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ChartCard } from '../components/ui/ChartCard'
import { CompatibilityRing } from '../components/ui/CompatibilityRing'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState, InlineError } from '../components/ui/ErrorState'
import { SkeletonCard } from '../components/ui/LoadingSkeleton'
import { PageHeader } from '../components/ui/PageHeader'
import { SkillChip } from '../components/ui/SkillChip'
import { Reveal, Stagger, StaggerItem } from '../motion/Reveal'
import { useAsync } from '../hooks/useAsync'
import { getApiErrorMessage } from '../services/api'
import { fetchOverallSkillGap } from '../services/matching'
import { createRoadmap } from '../services/roadmap'
import type { SkillConstellationNode, SkillGapItem } from '../types'
import { ease } from '../motion/tokens'

const IMPORTANCE_TONE: Record<string, 'danger' | 'warn' | 'neutral'> = {
  high: 'danger',
  medium: 'warn',
  low: 'neutral',
}

export default function SkillGap() {
  const { data, loading, error, reload } = useAsync(fetchOverallSkillGap, [])
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const [building, setBuilding] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const buildRoadmap = async () => {
    setBuilding(true)
    setActionError(null)
    try {
      const roadmap = await createRoadmap()
      navigate(`/roadmap?roadmap=${roadmap.id}`)
    } catch (caught) {
      setActionError(getApiErrorMessage(caught))
    } finally {
      setBuilding(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    )
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'Skill gap could not be loaded.'} onRetry={reload} />
  }

  const nodes: SkillConstellationNode[] = [
    ...data.available.map((item) => ({ ...item, state: 'owned' as const })),
    ...data.developing.map((item) => ({ ...item, state: 'learning' as const })),
    ...data.missing.map((item) => ({ ...item, state: 'gap' as const })),
  ]

  const hasAnything = nodes.length > 0

  return (
    <div className="space-y-6">
      <Reveal amount={0.12}>
        <PageHeader
          title="Skill gap analysis"
          subtitle="What your target opportunities ask for, and where you stand against it."
          actions={
            data.missing.length > 0 && (
              <Button
                loading={building}
                icon={<RouteIcon className="h-4 w-4" />}
                onClick={() => void buildRoadmap()}
              >
                Generate roadmap from gaps
              </Button>
            )
          }
        />
      </Reveal>

      <AnimatePresence>
        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: ease.out }}
          >
            <InlineError message={actionError} />
          </motion.div>
        )}
      </AnimatePresence>

      {data.note && (
        <Reveal amount={0.12} delay={0.06}>
          <p className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-xs text-slate-400">
            {data.note}
          </p>
        </Reveal>
      )}

      {!hasAnything && (
        <Reveal>
          <EmptyState
            icon={Target}
            title="Nothing to analyse yet"
            description="Add skills to your profile or upload a resume so we can compare you against real opportunity requirements."
            action={
              <Link to="/resume">
                <Button>Upload resume</Button>
              </Link>
            }
          />
        </Reveal>
      )}

      {hasAnything && (
        <>
          <Reveal amount={0.12} delay={0.06}>
            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <ChartCard
                title="Skill network"
                subtitle="Available, developing and missing skills across your target roles"
              >
                <SkillNetwork nodes={nodes} />
              </ChartCard>

              <div className="space-y-4">
                <ChartCard
                  title="Coverage"
                  subtitle={data.scope || 'Status across your target skills'}
                >
                  {(() => {
                    const total = nodes.length
                    const covered = data.available.length + data.developing.length
                    const percent = total ? (covered / total) * 100 : 0
                    return (
                      <div className="flex flex-col items-center gap-3">
                        <CompatibilityRing
                          value={percent}
                          size={140}
                          label="Skills covered"
                        />
                        <ul className="w-full space-y-2 text-xs">
                          <li className="flex items-center justify-between text-slate-400">
                            <span className="inline-flex items-center gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              Available
                            </span>
                            <span className="text-slate-200">{data.available.length}</span>
                          </li>
                          <li className="flex items-center justify-between text-slate-400">
                            <span className="inline-flex items-center gap-2">
                              <CircleDot className="h-3.5 w-3.5 text-brand-300" />
                              Developing
                            </span>
                            <span className="text-slate-200">{data.developing.length}</span>
                          </li>
                          <li className="flex items-center justify-between text-slate-400">
                            <span className="inline-flex items-center gap-2">
                              <Target className="h-3.5 w-3.5 text-amber-300" />
                              To learn
                            </span>
                            <span className="text-slate-200">{data.missing.length}</span>
                          </li>
                        </ul>
                      </div>
                    )
                  })()}
                </ChartCard>
              </div>
            </section>
          </Reveal>

          <Stagger className="grid gap-4 lg:grid-cols-3" step={0.07} amount={0.12} lead={0.08}>
            {/* Available */}
            <StaggerItem className="sb-glass rounded-2xl p-5">
              <h2 className="inline-flex items-center gap-2 font-display text-sm font-semibold text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Available ({data.available.length})
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                On your profile and, where assessed, mastered.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {data.available.length === 0 ? (
                  <p className="text-xs text-slate-500">None yet.</p>
                ) : (
                  data.available.map((item, idx) => (
                    <motion.span
                      key={item.slug}
                      initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.86 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.04, duration: 0.22, ease: ease.out }}
                    >
                      <SkillChip label={item.name} state="matched" />
                    </motion.span>
                  ))
                )}
              </div>
            </StaggerItem>

            {/* Developing */}
            <StaggerItem className="sb-glass rounded-2xl p-5">
              <h2 className="inline-flex items-center gap-2 font-display text-sm font-semibold text-white">
                <CircleDot className="h-4 w-4 text-brand-300" />
                Developing ({data.developing.length})
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                In progress on your roadmap or partially assessed.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {data.developing.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Nothing in progress. Start a roadmap step to see it here.
                  </p>
                ) : (
                  data.developing.map((item, idx) => (
                    <motion.span
                      key={item.slug}
                      initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.86 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.04, duration: 0.22, ease: ease.out }}
                    >
                      <SkillChip label={item.name} state="learning" />
                    </motion.span>
                  ))
                )}
              </div>
            </StaggerItem>

            {/* Missing */}
            <StaggerItem className="sb-glass rounded-2xl p-5">
              <h2 className="inline-flex items-center gap-2 font-display text-sm font-semibold text-white">
                <Target className="h-4 w-4 text-amber-300" />
                To learn ({data.missing.length})
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Ranked by how many of your target roles need them.
              </p>

              {data.missing.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">
                  You cover every required skill in your target set. Nice work.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.missing.slice(0, 12).map((item: SkillGapItem, idx) => (
                    <motion.li
                      key={item.slug}
                      className="rounded-xl border border-white/8 bg-white/4 px-3 py-2.5"
                      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.24, ease: ease.out }}
                      whileHover={reduced ? undefined : { y: -1.5 }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-medium text-slate-200">{item.name}</p>
                        <Badge tone={IMPORTANCE_TONE[item.importance] ?? 'neutral'}>
                          {item.importance}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                        {item.why_it_matters}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>{item.opportunities_requiring} opportunities require it</span>
                        {item.in_roadmap && <Badge tone="brand">on your roadmap</Badge>}
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}

              {data.missing.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  fullWidth
                  loading={building}
                  icon={<RouteIcon className="h-4 w-4" />}
                  onClick={() => void buildRoadmap()}
                >
                  Add these gaps to a roadmap
                </Button>
              )}
            </StaggerItem>
          </Stagger>

          <Reveal delay={0.12}>
            <p className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
              We only mark a skill as <strong className="text-slate-400">available</strong> when it is
              on your profile. We never claim proficiency we have no evidence for — taking an assessment
              is what turns progress into mastery.
            </p>
          </Reveal>
        </>
      )}
    </div>
  )
}
