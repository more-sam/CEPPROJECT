import { Link } from 'react-router-dom'

import { useAsync } from '../../hooks/useAsync'
import { listOpenJobs } from '../../services/jobs'
import { useAuth } from '../../store/authContext'
import type { OpportunityCard as OpportunityCardType } from '../../types'
import { OpportunityCard } from './OpportunityCard'

interface OpenOpportunitiesProps {
  limit?: number
  title?: string
  subtitle?: string
}

/**
 * "Open Opportunities" - the prominent dashboard section.
 *
 * Backed by `GET /jobs/open`, which returns only rows whose stored `status` is
 * `open`, ranked by compatibility. An unverified (`unknown`) or closed listing
 * cannot appear here, so the section never implies a live vacancy the database
 * does not record.
 */
export function OpenOpportunities({
  limit = 6,
  title = 'Open Opportunities',
  subtitle = 'Currently available opportunities that match your skills.',
}: OpenOpportunitiesProps) {
  const { status: authStatus } = useAuth()
  const isAuthenticated = authStatus === 'authenticated'

  const { data, loading, error } = useAsync(
    () =>
      listOpenJobs({ sort: 'compatibility', page_size: limit }).then(
        (response) => response.items as OpportunityCardType[],
      ),
    [limit],
    { enabled: isAuthenticated },
  )

  if (!isAuthenticated) return null

  const items = data ?? []

  return (
    <section className="space-y-4" aria-labelledby="open-opportunities-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="open-opportunities-heading"
            className="font-display text-lg font-semibold tracking-tight text-white"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        <Link
          to="/opportunities"
          className="text-xs font-medium text-brand-300 hover:text-brand-200"
        >
          View all opportunities
        </Link>
      </div>

      {error && (
        <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: Math.min(limit, 3) }).map((_, index) => (
            <div key={index} className="sb-glass space-y-3 rounded-2xl p-5">
              <div className="h-4 w-2/3 animate-pulse rounded bg-white/6" />
              <div className="h-3 w-full animate-pulse rounded bg-white/6" />
              <div className="h-20 w-full animate-pulse rounded bg-white/6" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="sb-glass rounded-2xl px-5 py-10 text-center">
          <h3 className="font-display text-sm font-semibold text-white">
            No opportunities are stored as open
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-400">
            SkillBridge only lists a role here when its stored status says
            applications are open. Browse all opportunities to see every listing.
          </p>
          <Link
            to="/opportunities"
            className="mt-4 inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Browse all opportunities
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </div>
      )}
    </section>
  )
}