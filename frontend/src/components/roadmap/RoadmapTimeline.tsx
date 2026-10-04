import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { CheckCircle2, Circle, CircleDot, Clock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { RoadmapItem, RoadmapStatus } from '../../types'
import { Badge, type BadgeTone } from '../ui/Badge'
import { Reveal } from '../../motion/Reveal'
import { ease } from '../../motion/tokens'

const PRIORITY_TONE: Record<string, BadgeTone> = {
  high: 'danger',
  medium: 'warn',
  low: 'neutral',
}

const STATUS_OPTIONS: { value: RoadmapStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
]

function StatusIcon({ status }: { status: RoadmapStatus }) {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
  if (status === 'in_progress') return <CircleDot className="h-4 w-4 text-brand-300" />
  return <Circle className="h-4 w-4 text-slate-500" />
}

interface RoadmapTimelineProps {
  items: RoadmapItem[]
  onStatusChange: (itemId: number, status: RoadmapStatus) => void
  busyItemId: number | null
}

/**
 * Totem-pole roadmap with a scroll-linked spine.
 *
 * The spine is a single SVG path that runs alongside the step dots. As the
 * timeline scrolls into and through the viewport the path draws itself - the
 * section the visitor has already seen reads as complete, while what lies ahead
 * is still a ghost line. Each row reveals when it crosses the fold, so later
 * steps do not appear until they are reached.
 */
export function RoadmapTimeline({ items, onStatusChange, busyItemId }: RoadmapTimelineProps) {
  const reduced = useReducedMotion()
  const listRef = useRef<HTMLOListElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const [totalLength, setTotalLength] = useState(0)

  // Measure the path once after layout.
  useEffect(() => {
    const node = pathRef.current
    if (!node) return
    setTotalLength(node.getTotalLength())
  }, [items.length])

  // Scroll progress while the list is passing through the viewport. Starts when
  // the list's top reaches 80% of the viewport and ends when its bottom reaches
  // the upper quarter - a generous window so a 10-step list has time to draw.
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ['start 0.82', 'end 0.22'],
  })

  const sProgress = useSpring(scrollYProgress, { stiffness: 90, damping: 30, mass: 0.6 })
  const pathDraw = useTransform(sProgress, [0, 1], [0, 1])

  return (
    <div className="relative">
      {/* Scroll-linked spine — sits behind the dots at desktop. Hidden on the
          smallest screens where the timeline is very narrow. */}
      {!reduced && totalLength > 0 && (
        <svg
          className="pointer-events-none absolute inset-y-0 left-[22px] hidden w-1 -translate-x-1/2 sm:block"
          aria-hidden="true"
          style={{ height: '100%' }}
          preserveAspectRatio="none"
        >
          <motion.path
            ref={pathRef}
            d={`M 0 14 L 0 ${totalLength || 1000}`}
            fill="none"
            stroke="rgba(255,255,255,0.09)"
            strokeWidth={1.5}
          />
          <motion.path
            d={`M 0 14 L 0 ${totalLength || 1000}`}
            fill="none"
            stroke="url(#roadmap-spine)"
            strokeWidth={1.8}
            strokeLinecap="round"
            // The draw is achieved through the trinity of SVG path animation:
            // the spec asks for path drawing, and `pathLength` is the framer
            // primitive for it.
            style={{ pathLength: pathDraw as never }}
          />

          <defs>
            <linearGradient id="roadmap-spine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.95} />
              <stop offset="55%" stopColor="#6366f1" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.9} />
            </linearGradient>
          </defs>
        </svg>
      )}

      <ol ref={listRef} className="relative space-y-3">
        {items.map((item, index) => (
          <Reveal key={item.id} amount={0.18} delay={index >= 6 ? 0 : index * 0.04} distance={14}>
            <RoadmapRow
              item={item}
              index={index}
              onStatusChange={onStatusChange}
              busyItemId={busyItemId}
            />
          </Reveal>
        ))}
      </ol>
    </div>
  )
}

function RoadmapRow({
  item,
  index,
  onStatusChange,
  busyItemId,
}: {
  item: RoadmapItem
  index: number
  onStatusChange: RoadmapTimelineProps['onStatusChange']
  busyItemId: number | null
}) {
  const reduced = useReducedMotion()

  return (
    <li className="relative flex gap-4">
      {/* Fallback connector for the reduced-motion case, where the scroll spine
          is not rendered. CSS vertical line, no animation. */}
      {reduced && index < 1 && (
        <span
          className="pointer-events-none absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-white/10 sm:block"
          aria-hidden="true"
        />
      )}

      <motion.span
        className="z-10 mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-900 ring-1 ring-white/10"
        whileHover={reduced ? undefined : { scale: 1.1 }}
        whileTap={reduced ? undefined : { scale: 0.94 }}
        transition={{ duration: 0.18, ease: ease.out }}
      >
        <StatusIcon status={item.status} />
      </motion.span>

      <motion.div
        className={`sb-glass flex-1 rounded-2xl p-4 ${item.status === 'completed' ? 'opacity-80' : ''}`}
        whileHover={reduced ? undefined : { y: -2, scale: 1.005 }}
        transition={{ duration: 0.22, ease: ease.out }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-sm font-semibold text-white">
              {item.order_index + 1}. {item.skill_name}
            </h3>
            <Badge tone={PRIORITY_TONE[item.priority] ?? 'neutral'}>{item.priority} priority</Badge>
            <Badge tone="neutral">{item.skill_category}</Badge>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <Clock className="h-3 w-3" />~{item.estimated_hours}h
          </span>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.reason}</p>

        {item.prerequisites.length > 0 && (
          <p className="mt-2 text-[11px] text-slate-500">Builds on: {item.prerequisites.join(', ')}</p>
        )}

        {item.resources.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {item.resources.map((resource) => (
              <li key={resource.url}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[11px] text-brand-300 underline decoration-brand-400/30 hover:text-brand-200"
                >
                  {resource.title}
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((option) => {
            const active = item.status === option.value
            return (
              <motion.button
                key={option.value}
                type="button"
                disabled={busyItemId === item.id}
                onClick={() => onStatusChange(item.id, option.value)}
                aria-pressed={active}
                whileTap={reduced ? undefined : { scale: 0.95 }}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition disabled:opacity-50 ${
                  active
                    ? 'bg-brand-500/20 text-brand-200 ring-1 ring-brand-400/30'
                    : 'border border-white/10 bg-white/5 text-slate-400 hover:text-white'
                }`}
                transition={{ duration: 0.12, ease: ease.out }}
              >
                {option.label}
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </li>
  )
}
