import { SearchX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { OpportunityCard } from '../components/opportunities/OpportunityCard'
import { FilterPanel, type FilterState } from '../components/opportunities/FilterPanel'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { SkeletonGrid } from '../components/ui/LoadingSkeleton'
import { PageHeader } from '../components/ui/PageHeader'
import { SearchBar } from '../components/ui/SearchBar'
import { useAsync } from '../hooks/useAsync'
import { getApiErrorMessage } from '../services/api'
import { getJobFilters, listJobs, DEFAULT_PAGE_SIZE } from '../services/jobs'
import { fetchSkillCatalogue } from '../services/profile'
import { toggleSavedJob } from '../services/matching'
import type { JobQuery, OpportunityCard as OpportunityCardType } from '../types'
import { useAuth } from '../store/authContext'

const SORT_OPTIONS: { value: NonNullable<JobQuery['sort']>; label: string }[] = [
  { value: 'compatibility', label: 'Highest skill alignment' },
  { value: 'relevance', label: 'Most relevant' },
  { value: 'newest', label: 'Newest' },
  { value: 'title', label: 'A–Z' },
]

const INITIAL_FILTERS: FilterState = {
  q: '',
  location: undefined,
  employment_type: undefined,
  work_type: undefined,
  experience_level: undefined,
  skill: undefined,
  min_compatibility: 0,
  status: undefined,
  company_id: undefined,
  sort: 'compatibility',
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
}

export default function Opportunities() {
  const { status } = useAuth()
  const signedIn = status === 'authenticated'
  const [searchParams, setSearchParams] = useSearchParams()

  const [filters, setFilters] = useState<FilterState>(() => ({
    ...INITIAL_FILTERS,
    skill: searchParams.get('skill') ?? undefined,
    status: (searchParams.get('status') as FilterState['status']) ?? undefined,
    company_id: searchParams.get('company_id')
      ? Number(searchParams.get('company_id'))
      : undefined,
    q: searchParams.get('q') ?? '',
  }))
  const [search, setSearch] = useState(filters.q ?? '')
  const [savingId, setSavingId] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // The prominent "Open Now" toggle. When on, every other `status` selection
  // is overridden by `open`, so the toggle reads as an honest filter over
  // stored data rather than a guess about live vacancies.
  const openOnly = filters.status === 'open'

  // Debounce the free-text box so typing does not hammer the API.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) =>
        current.q === search ? current : { ...current, q: search, page: 1 },
      )
    }, 350)
    return () => window.clearTimeout(timer)
  }, [search])

  // Keep the URL in sync so a search can be shared or reloaded.
  useEffect(() => {
    const next = new URLSearchParams()
    if (filters.q) next.set('q', filters.q)
    if (filters.skill) next.set('skill', filters.skill)
    if (filters.status) next.set('status', filters.status)
    if (filters.company_id) next.set('company_id', String(filters.company_id))
    setSearchParams(next, { replace: true })
  }, [filters.q, filters.skill, filters.status, filters.company_id, setSearchParams])

  const filterOptions = useAsync(getJobFilters, [])
  const catalogue = useAsync(() => fetchSkillCatalogue(), [])

  const query = useMemo<JobQuery>(() => {
    const built: JobQuery = { ...filters }
    if (!built.min_compatibility) delete built.min_compatibility
    return built
  }, [filters])

  const queryKey = useMemo(() => JSON.stringify(query), [query])
  const jobs = useAsync(() => listJobs(query), [queryKey])

  const items = jobs.data?.items ?? []
  const meta = jobs.data?.meta

  const handleToggleSave = async (jobId: number, nextSaved: boolean) => {
    setSavingId(jobId)
    setSaveError(null)
    try {
      await toggleSavedJob(jobId, !nextSaved)
      jobs.setData(
        jobs.data
          ? {
              ...jobs.data,
              items: jobs.data.items.map((item: OpportunityCardType) =>
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

  const goToPage = (page: number) => setFilters((current) => ({ ...current, page }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunities"
        subtitle="Internships and entry-level roles scored against your skills."
        actions={
          <select
            aria-label="Sort opportunities"
            value={filters.sort ?? 'compatibility'}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                sort: event.target.value as JobQuery['sort'],
                page: 1,
              }))
            }
            className="rounded-xl border border-white/10 bg-ink-850 px-3 py-2 text-xs text-slate-300 focus:border-brand-400/40 focus:outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <div className="space-y-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            onSubmit={() => setFilters((current) => ({ ...current, page: 1 }))}
            placeholder="Search jobs, companies or skills"
          />

          <div className="sb-glass rounded-2xl p-4">
            <label
              htmlFor="filter-skill"
              className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-slate-500"
            >
              Required skill
            </label>
            <select
              id="filter-skill"
              value={filters.skill ?? ''}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  skill: event.target.value || undefined,
                  page: 1,
                }))
              }
              className="w-full rounded-xl border border-white/10 bg-ink-850 px-3 py-2 text-xs text-slate-300 focus:border-brand-400/40 focus:outline-none"
            >
              <option value="">Any skill</option>
              {(catalogue.data ?? []).map((skill) => (
                <option key={skill.id} value={skill.slug}>
                  {skill.name}
                </option>
              ))}
            </select>
          </div>

          <FilterPanel
            options={filterOptions.data}
            value={filters}
            onChange={setFilters}
            showCompatibility={signedIn}
          />

          {/* One-tap "show only what is genuinely open for applications". */}
          <div className="sb-glass rounded-2xl p-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Application status
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    status: current.status === 'open' ? undefined : 'open',
                    page: 1,
                  }))
                }
                aria-pressed={openOnly}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  openOnly
                    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${openOnly ? 'bg-emerald-400' : 'bg-slate-500'}`}
                  aria-hidden="true"
                />
                Open now only
              </button>
              <span className="text-[11px] text-slate-500">only status = open</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {saveError && (
            <p role="alert" className="text-xs text-rose-300">
              {saveError}
            </p>
          )}

          {jobs.loading && <SkeletonGrid count={6} />}

          {jobs.error && !jobs.loading && (
            <ErrorState message={jobs.error} onRetry={jobs.reload} />
          )}

          {!jobs.loading && !jobs.error && items.length === 0 && (
            <EmptyState
              icon={SearchX}
              title="No opportunities match these filters"
              description="Try widening your search, clearing a filter, or lowering the minimum compatibility."
              action={
                <Button variant="secondary" onClick={() => setFilters({ ...INITIAL_FILTERS })}>
                  Reset filters
                </Button>
              }
            />
          )}

          {!jobs.loading && !jobs.error && items.length > 0 && (
            <>
              <p className="text-xs text-slate-500">
                Showing {items.length} of {meta?.total ?? items.length} opportunities
                <span className="ml-2 rounded-full bg-white/6 px-2 py-0.5 text-[10px] text-slate-400">
                  Demo/seed opportunity data
                </span>
              </p>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((opportunity: OpportunityCardType) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    onToggleSave={
                      signedIn
                        ? (jobId, nextSaved) => void handleToggleSave(jobId, nextSaved)
                        : undefined
                    }
                    busy={savingId === opportunity.id}
                  />
                ))}
              </div>

              {meta && meta.total_pages > 1 && (
                <nav
                  aria-label="Pagination"
                  className="flex items-center justify-between gap-3 pt-2"
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!meta.has_previous}
                    onClick={() => goToPage(meta.page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-slate-500">
                    Page {meta.page} of {meta.total_pages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!meta.has_next}
                    onClick={() => goToPage(meta.page + 1)}
                  >
                    Next
                  </Button>
                </nav>
              )}
            </>
          )}

          {!signedIn && (
            <div className="sb-glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
              <p className="text-xs text-slate-400">
                Sign in and upload a resume to see your SkillBridge Compatibility on every
                opportunity.
              </p>
              <div className="flex gap-2">
                <Link to="/register">
                  <Button size="sm">Create account</Button>
                </Link>
                <Link to="/login">
                  <Button variant="secondary" size="sm">
                    Sign in
                  </Button>
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
