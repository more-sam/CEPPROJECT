import { CheckCircle2, Circle, CircleDot, Clock } from 'lucide-react'

import type { RoadmapItem, RoadmapStatus } from '../../types'
import { Badge, type BadgeTone } from '../ui/Badge'

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

/** Ordered, prerequisite-aware learning path (signature visual #3). */
export function RoadmapTimeline({
  items,
  onStatusChange,
  busyItemId,
}: RoadmapTimelineProps) {
  return (
    <ol className="relative space-y-3">
      {items.map((item, index) => (
        <li key={item.id} className="relative flex gap-4">
          {/* Connector line between steps. */}
          {index < items.length - 1 && (
            <span
              className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-white/10"
              aria-hidden="true"
            />
          )}

          <span className="z-10 mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-900 ring-1 ring-white/10">
            <StatusIcon status={item.status} />
          </span>

          <div
            className={`sb-glass flex-1 rounded-2xl p-4 ${
              item.status === 'completed' ? 'opacity-80' : ''
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-sm font-semibold text-white">
                  {item.order_index + 1}. {item.skill_name}
                </h3>
                <Badge tone={PRIORITY_TONE[item.priority] ?? 'neutral'}>
                  {item.priority} priority
                </Badge>
                <Badge tone="neutral">{item.skill_category}</Badge>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <Clock className="h-3 w-3" />
                ~{item.estimated_hours}h
              </span>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.reason}</p>

            {item.prerequisites.length > 0 && (
              <p className="mt-2 text-[11px] text-slate-500">
                Builds on: {item.prerequisites.join(', ')}
              </p>
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
                  <button
                    key={option.value}
                    type="button"
                    disabled={busyItemId === item.id}
                    onClick={() => onStatusChange(item.id, option.value)}
                    aria-pressed={active}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition disabled:opacity-50 ${
                      active
                        ? 'bg-brand-500/20 text-brand-200 ring-1 ring-brand-400/30'
                        : 'border border-white/10 bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
