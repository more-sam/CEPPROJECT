import { Route as RouteIcon, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { RoadmapTimeline } from '../components/roadmap/RoadmapTimeline'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState, InlineError } from '../components/ui/ErrorState'
import { SkeletonCard } from '../components/ui/LoadingSkeleton'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useAsync } from '../hooks/useAsync'
import { getApiErrorMessage } from '../services/api'
import {
  createRoadmap,
  deleteRoadmap,
  listRoadmaps,
  updateRoadmapItem,
} from '../services/roadmap'
import type { Roadmap as RoadmapType, RoadmapStatus } from '../types'

export default function Roadmap() {
  const roadmapsState = useAsync(listRoadmaps, [])
  const [searchParams, setSearchParams] = useSearchParams()

  const roadmaps = roadmapsState.data ?? []
  const selectedId = Number(searchParams.get('roadmap')) || null

  const [busyItemId, setBusyItemId] = useState<number | null>(null)
  const [building, setBuilding] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [localRoadmap, setLocalRoadmap] = useState<RoadmapType | null>(null)

  // The selected roadmap: prefer the locally-updated copy, else the fetched one.
  const selected = useMemo(() => {
    if (!roadmaps.length) return null
    if (selectedId) {
      return roadmaps.find((roadmap) => roadmap.id === selectedId) ?? roadmaps[0]
    }
    return roadmaps[0]
  }, [roadmaps, selectedId])

  const display = localRoadmap && localRoadmap.id === selected?.id ? localRoadmap : selected

  // Reset the optimistic copy whenever a different roadmap is selected.
  useEffect(() => {
    setLocalRoadmap(null)
  }, [display?.id])

  const handleGenerate = async () => {
    setBuilding(true)
    setActionError(null)
    try {
      const roadmap = await createRoadmap()
      roadmapsState.reload()
      setSearchParams({ roadmap: String(roadmap.id) }, { replace: true })
    } catch (caught) {
      setActionError(getApiErrorMessage(caught))
    } finally {
      setBuilding(false)
    }
  }

  const handleStatusChange = async (itemId: number, status: RoadmapStatus) => {
    if (!display) return
    setBusyItemId(itemId)
    setActionError(null)
    try {
      const updated = await updateRoadmapItem(display.id, itemId, status)
      // Update locally so the timeline responds immediately.
      const items = display.items.map((item) => (item.id === itemId ? updated : item))
      const completed = items.filter((item) => item.status === 'completed').length
      const inProgress = items.filter((item) => item.status === 'in_progress').length
      const completedHours = items
        .filter((item) => item.status === 'completed')
        .reduce((sum, item) => sum + item.estimated_hours, 0)

      setLocalRoadmap({
        ...display,
        items,
        completed_items: completed,
        in_progress_items: inProgress,
        completed_hours: completedHours,
        progress_percentage: items.length ? (completed / items.length) * 100 : 0,
      })
    } catch (caught) {
      setActionError(getApiErrorMessage(caught))
    } finally {
      setBusyItemId(null)
    }
  }

  const handleDelete = async () => {
    if (!display) return
    setActionError(null)
    try {
      await deleteRoadmap(display.id)
      roadmapsState.reload()
      setSearchParams({}, { replace: true })
    } catch (caught) {
      setActionError(getApiErrorMessage(caught))
    }
  }

  if (roadmapsState.loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={5} />
      </div>
    )
  }

  if (roadmapsState.error) {
    return <ErrorState message={roadmapsState.error} onRetry={roadmapsState.reload} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning roadmap"
        subtitle="An ordered, prerequisite-aware path covering only the gaps that matter."
        actions={
          <Button
            loading={building}
            icon={<Sparkles className="h-4 w-4" />}
            onClick={() => void handleGenerate()}
          >
            {roadmaps.length ? 'Regenerate from gaps' : 'Generate roadmap'}
          </Button>
        }
      />

      {actionError && <InlineError message={actionError} />}

      {roadmaps.length === 0 ? (
        <EmptyState
          icon={RouteIcon}
          title="No roadmap yet"
          description="Analyse an opportunity or generate a roadmap from your skill gaps to get a personalised learning path."
          action={
            <>
              <Button
                loading={building}
                onClick={() => void handleGenerate()}
                icon={<Sparkles className="h-4 w-4" />}
              >
                Generate roadmap
              </Button>
              <Link to="/skill-gap">
                <Button variant="secondary">Review skill gaps</Button>
              </Link>
            </>
          }
        />
      ) : (
        display && (
          <>
            {roadmaps.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {roadmaps.map((roadmap) => (
                  <button
                    key={roadmap.id}
                    type="button"
                    onClick={() => setSearchParams({ roadmap: String(roadmap.id) }, { replace: true })}
                    className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
                      roadmap.id === display.id
                        ? 'bg-brand-500/20 text-brand-200 ring-1 ring-brand-400/30'
                        : 'border border-white/10 bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {roadmap.title}
                  </button>
                ))}
              </div>
            )}

            <section className="sb-glass rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-white">
                    {display.title}
                  </h2>
                  {display.description && (
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
                      {display.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone="brand">{display.source === 'job' ? 'Targeted role' : 'Skill gaps'}</Badge>
                    {display.target_job_title && (
                      <Badge tone="aqua">{display.target_job_title}</Badge>
                    )}
                    <Badge tone="neutral">{display.total_hours}h total</Badge>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete roadmap
                </button>
              </div>

              <div className="mt-5 space-y-2">
                <ProgressBar value={display.progress_percentage} showLabel tone="success" />
                <p className="text-[11px] text-slate-500">
                  {display.completed_items} of {display.total_items} steps complete ·{' '}
                  {display.completed_hours}h of {display.total_hours}h done
                </p>
              </div>
            </section>

            <RoadmapTimeline
              items={display.items}
              onStatusChange={(itemId, status) => void handleStatusChange(itemId, status)}
              busyItemId={busyItemId}
            />
          </>
        )
      )}
    </div>
  )
}
