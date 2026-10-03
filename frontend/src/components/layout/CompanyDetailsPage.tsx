import { ArrowLeft, ExternalLink, MapPin, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { CompanyLogo } from '../ui/CompanyLogo'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { SkeletonCard, SkeletonMetrics } from '../ui/LoadingSkeleton'
import { PageHeader } from '../ui/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { getApiErrorMessage } from '../services/api'
import { fetchCompany, listCompanyJobs } from '../services/companies'
import type { CompanyDetail, CompanyJobsResponse, OpportunityCard } from '../types'

/**
 * Company details page (spec §14).
 *
 * Surface the company record the way the spec wants:
 *
 *   - logo (explicit logo_url, otherwise the favicon-resolved company mark)
 *   - official website (never rendered if it fails `isSafeExternalUrl`)
 *   - industry + location
 *   - description
 *   - a list of the company's open listings (status `open`) with the full
 *     matching card: compatibility, matched/missing skills, status, apply action
 *
 * The page gracefully handles a company with no jobs and a company the backend
 * cannot find (404) without throwing.
 */export default function CompanyDetailsPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const numericId = Number(companyId)

  const [jobList, setJobList] = useState<CompanyJobsResponse | null>(null)

  const { data, loading, error, reload } = useAsync(
    () => {
      if (!Number.isFinite(numericId)) throw new Error('Invalid company id')
      return fetchCompany(numericId)
    },
    [numericId],
    { enabled: Boolean(numericId) },
  )

  const detail = data as CompanyDetail | undefined

  // Load the company's jobs once the record is known (guarded: the backend may
  // never return a job for a visited company).
  useEffect(() => {
    if (!loading && !error && detail && Number.isFinite(numericId)) {
      void (async () => {
        try {
          const jobs = await listCompanyJobs(numericId)
          setJobList(jobs)
        } catch (caught) {
          // The UI falls back to an empty list - the company record is still
          // shown, so browsing the directory is never a dead end.
          setJobList({ items: [], meta: { total: 0, page: 1, page_size: 12, total_pages: 0, has_next: false, has_previous: false } })
        }
      })()
    }
  }, [detail, loading, error, numericId])

  const handleOpenCompany = (company: CompanyDetail) => {
    if (company.website_url && window.isSafeExternalUrl?.(company.website_url)) {
      window.open(company.website_url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title={detail?.name ?? 'Company'}
        subtitle="The organisation behind the roles we surface."
        actions={
          <button
            type="button"
            onClick={() => handleOpenCompany(detail ?? { website_url: '' })}
            disabled={!detail?.website_url}
            className="inline-flex items-center gap-2 text-xs font-medium text-brand-300 transition hover:text-brand-200 disabled:opacity-40"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            {detail?.website_url ? 'Visit official website' : 'No website on file'}
          </button>
        }
      />

      {/* Header */}
      <section className="sb-glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-5">
            <CompanyLogo
              companyName={detail?.name ?? ''}
              logoUrl={detail?.logo_url}
              websiteUrl={detail?.website_url}
              size={64}
            />
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold tracking-tight text-white">
                {detail?.name ?? 'Company'}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                {detail?.location ?? 'No location on file'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {detail?.industry && (
                  <Badge tone="neutral">{detail?.industry}</Badge>
                )}
                {detail?.website_url && (
                  <Badge tone="brand">Official website</Badge>
                )}
                <Badge tone="neutral">{detail?.jobs?.length ?? 0} roles</Badge>
              </div>
            </div>
          </div>

          {!loading && !error && detail && (
            <div className="flex shrink-0 flex-col items-center gap-3">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-white/8 bg-white/5 text-lg font-display font-semibold text-slate-200">
                {detail.initials ?? detail.name.slice(0, 2).toUpperCase()}
              </div>
              <p className="text-xs text-slate-500">Industry</p>
            </div>
          )}
        </div>

        {error && !loading && (
          <div className="mt-4">
            <EmptyState
              icon={MapPin}
              title="Company not found"
              description={error}
              action={
                <Button variant="secondary" onClick={() => reload()}>
                  Try again
                </Button>
              }
            />
          </div>
        )}

        {detail?.description && (
          <div className="mt-5 rounded-xl border border-white/8 bg-white/4 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              About {detail.name}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
              {detail.description}
            </p>
          </div>
        )}
      </section>

      {/* Jobs */}
      {jobList?.items.length ? (
        <section>
          <header className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-white">
                Roles at {detail?.name ?? 'This company'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Currently open positions for this employer. Filtered to status
                `open`; closed/expired roles are hidden.
              </p>
            </div>
            <Link to="/opportunities" className="text-xs font-medium text-brand-300 hover:text-brand-200">
              Browse all roles
            </Link>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {jobList.items.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="sb-glass rounded-2xl p-5">
          <EmptyState
            icon={Users}
            title="No open roles yet"
            description={
              loading
                ? 'Loading roles…'
                : 'This company has no listings with status `open`, so there is nothing to match against yet.'
            }
          />
        </section>
      )}

      {loading && !error && !detail && <SkeletonMetrics />}
    </div>
  )
}
