import { ArrowLeft, Briefcase, ExternalLink, MapPin } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { OpportunityCard } from '../components/opportunities/OpportunityCard'
import { ApplicationStatus } from '../components/ui/ApplicationStatus'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { CompanyLogo } from '../components/ui/CompanyLogo'
import { ErrorState } from '../components/ui/ErrorState'
import { PageHeader } from '../components/ui/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { fetchCompany, listCompanyJobs } from '../services/companies'
import type { OpportunityCard as OpportunityCardType } from '../types'
import { displayHost, isSafeExternalUrl } from '../utils/links'

/**
 * Company details page.
 *
 * Answers, in order: who is this employer, what is their verified website,
 * what are they hiring for right now, and what else have they listed.
 *
 * "Open" and "Other" are separated on purpose. A closed or unverified listing is
 * still worth showing, but it must never sit in the same list as a role that is
 * genuinely accepting applications.
 *
 * Requires no auth: an anonymous visitor sees the company and its listings with
 * compatibility omitted, never faked.
 */
export default function CompanyDetailsPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const numericId = Number(companyId)

  const {
    data: company,
    error: companyError,
    reload,
  } = useAsync(
    () => {
      if (!Number.isFinite(numericId)) throw new Error('Invalid company id')
      return fetchCompany(numericId)
    },
    [numericId],
    { enabled: Number.isFinite(numericId) },
  )

  const {
    data: jobs,
    loading: jobsLoading,
    error: jobsError,
  } = useAsync(
    () => listCompanyJobs(numericId, { page_size: 60, sort: 'newest' }),
    [numericId],
    { enabled: Number.isFinite(numericId) },
  )

  if (companyError) {
    return (
      <div className="space-y-6">
        <Link
          to="/opportunities"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to opportunities
        </Link>
        <ErrorState message={companyError} onRetry={reload} />
      </div>
    )
  }

  const all: OpportunityCardType[] = jobs?.items ?? []
  const openJobs = all.filter((job) => job.status === 'open')
  const otherJobs = all.filter((job) => job.status !== 'open')
  const website = isSafeExternalUrl(company?.website_url) ? company.website_url : null
  const host = displayHost(company?.website_url)

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/opportunities"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to opportunities
        </Link>
        {company && (
          <span className="ml-auto text-xs text-slate-500">
            {company.open_roles} open role{company.open_roles === 1 ? '' : 's'} of{' '}
            {company.total_roles} listed
          </span>
        )}
      </div>

      <PageHeader
        title={company?.name ?? 'Company'}
        subtitle="The organisation behind the roles in your results."
        actions={
          website ? (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Visit official website
            </a>
          ) : (
            <span className="text-xs text-slate-500">Official website unavailable</span>
          )
        }
      />

      {/* Company record */}
      <section className="sb-glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <CompanyLogo
            companyName={company?.name ?? ''}
            logoUrl={company?.logo_url}
            websiteUrl={company?.website_url}
            size={64}
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-semibold tracking-tight text-white">
              {company?.name ?? 'Loading…'}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {company?.location && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {company.location}
                </span>
              )}
              {company?.industry && <Badge tone="neutral">{company.industry}</Badge>}
              <Badge tone="brand">
                <Briefcase className="h-3 w-3" aria-hidden="true" />
                {company?.open_roles ?? 0} open
              </Badge>
            </div>

            {/* Website line is always present: available or not. */}
            <p className="mt-3 text-xs text-slate-400">
              Official website:{' '}
              {website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-300 hover:text-brand-200"
                >
                  {host}
                </a>
              ) : (
                <span className="text-slate-500">
                  unavailable — no verified website on file
                </span>
              )}
            </p>

            {company?.description && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                {company.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {jobsError && <ErrorState message={jobsError} />}

      {/* Open roles */}
      <section className="space-y-4" aria-labelledby="company-open-heading">
        <div>
          <h2
            id="company-open-heading"
            className="font-display text-base font-semibold text-white"
          >
            Open Opportunities
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Roles at {company?.name ?? 'this company'} whose stored status is open
            for applications.
          </p>
        </div>

        {jobsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="sb-glass h-48 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : openJobs.length === 0 ? (
          <div className="sb-glass rounded-2xl px-5 py-10 text-center">
            <h3 className="font-display text-sm font-semibold text-white">
              No open roles right now
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-400">
              Nothing here is currently stored as accepting applications.
              {otherJobs.length > 0 &&
                ' Closed and unverified listings are listed below.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {openJobs.map((job) => (
              <OpportunityCard key={job.id} opportunity={job} />
            ))}
          </div>
        )}
      </section>

      {/* Everything else, kept visually separate so it is never read as live. */}
      {otherJobs.length > 0 && (
        <section className="space-y-4" aria-labelledby="company-other-heading">
          <div>
            <h2
              id="company-other-heading"
              className="font-display text-base font-semibold text-white"
            >
              Other Opportunities
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Closed, expired and unverified listings. These are not accepting
              applications.
            </p>
          </div>

          <div className="space-y-3">
            {otherJobs.map((job) => (
              <div
                key={job.id}
                className="sb-glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CompanyLogo
                    companyName={company?.name ?? ''}
                    logoUrl={company?.logo_url}
                    websiteUrl={company?.website_url}
                    size={36}
                  />
                  <div className="min-w-0">
                    <Link
                      to={`/opportunities/${job.id}`}
                      className="truncate font-display text-sm font-semibold text-white hover:text-brand-200"
                    >
                      {job.title}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                      {job.location} · {job.employment_type.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <ApplicationStatus status={job.status} expiresAt={job.expires_at} />
                  <Link
                    to={`/opportunities/${job.id}`}
                    className="text-[11px] font-medium text-brand-300 hover:text-brand-200"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex justify-center pt-2">
        <Link to="/opportunities">
          <Button variant="ghost" size="sm">
            Browse all opportunities
          </Button>
        </Link>
      </div>
    </div>
  )
}