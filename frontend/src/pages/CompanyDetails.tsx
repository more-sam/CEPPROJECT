import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Button } from '../components/ui/Button'
import { CompanyLogo } from '../components/ui/CompanyLogo'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { PageHeader } from '../components/ui/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { getApiErrorMessage } from '../services/api'
import { fetchCompany, listCompanyJobs } from '../services/companies'
import type { CompanyDetail, CompanyJobsResponse, OpportunityCard } from '../types'

/**
 * Company detail page (spec §14).
 *
 * Surface the company record the way the spec wants:
 *
 *   - logo, official website, industry + location, description
 *   - a list of that company's `open` listings, each with compatibility,
 *     matched/missing skills, status and an Apply/View action
 *
 * Backing the page with `open-jobs` (rather than a plain `/jobs?company_id`)
 * keeps closed and expired listings out of the company view, matching the
 * spec's "open role" framing and the demo disclaimer.
 */export default function CompanyDetailsPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const numericId = Number(companyId)

  const companyState = useAsync(
    () => {
      if (!Number.isFinite(numericId)) throw new Error('Invalid company id')
      return fetchCompany(numericId)
    },
    [numericId],
    { enabled: Boolean(numericId) },
  )

  const { data: company, loading: companyLoading, error: companyError, reload: reloadCompany } = companyState

  const [jobs, setJobs] = useState<CompanyJobsResponse | null>(null)
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [jobsError, setJobsError] = useState<string | null>(null)

  // Load the company's open jobs once the record is known. The backend may
  // never return jobs for a company a student inadvertently visited, so a
  // failure here must never crash the page.
  useMemo(() => {
    if (!companyLoading && !companyError && company && Number.isFinite(numericId)) {
      setLoadingJobs(true)
      setJobsError(null)
      listCompanyJobs(numericId)
        .then(setJobs)
        .catch((caught) => setJobsError(getApiErrorMessage(caught)))
        .finally(() => setLoadingJobs(false))
    }
  }, [companyLoading, companyError, company, numericId])

  const detail = company as CompanyDetail | undefined

  return (
    <div className="space-y-7">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <a href="/opportunities">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to opportunities
          </a>
        </Button>
        <div className="ml-auto text-xs text-slate-500">
          {detail?.open_roles ?? 0} open role{company?.open_roles !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Header */}
      <PageHeader
        title={detail?.name ?? 'Company'}
        subtitle="The organisation behind the roles we surface."
        actions={
          detail?.website_url && (
            <Button
              variant="secondary"
              size="sm"
              asChild
            >
              <a href={detail.website_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Visit official website
              </a>
            </Button>
          )
        }
      />

      {/* Company record */}
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
                {detail?.industry && <span className="text-xs text-slate-400">{detail?.industry}</span>}
                {detail?.website_url && <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><ExternalLink className="h-3 w-3" aria-hidden="true" /> Official website</span>}
                <span className="text-xs text-slate-500">{detail?.jobs?.length ?? 0} roles</span>
              </div>
            </div>
          </div>

          {detail?.description && (
            <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-xs leading-relaxed text-slate-300">
              {detail.description}
            </div>
          )}
        </div>
      </section>

      {/* Jobs */}
      {companyLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="sb-glass space-y-3 rounded-2xl p-5">
              <div className="h-4 w-2/3 animate-pulse rounded" />
              <div className="h-3 w-full animate-pulse rounded" />
              <div className="h-3 w-2/3 animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : jobsError ? (
        <ErrorState message={jobsError} onRetry={() => setLoadingJobs(true)} />
      ) : jobs?.items.length ? (
        <section>
          <header className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-white">
                Roles at {detail?.name ?? 'This company'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Currently open positions. Closed, expired and unknown-status
                listings do not appear here.
              </p>
            </div>
            <a href="/opportunities" className="text-xs font-medium text-brand-300 hover:text-brand-200">
              Browse all roles
            </a>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {jobs.items.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="sb-glass rounded-2xl p-5">
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/12 text-brand-300 ring-1 ring-brand-400/20">
              <span className="text-lg">👥</span>
            </div>
            <h3 className="font-display text-base font-semibold text-white">No open roles yet</h3>
            <p className="max-w-sm text-sm text-slate-400">
              This company has no listings with status `open`, so there are no
              roles for the students to apply to right now.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
