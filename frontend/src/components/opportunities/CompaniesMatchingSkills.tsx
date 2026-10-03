import { Building2, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAsync } from '../../hooks/useAsync'
import { listMatchingCompanies } from '../../services/companies'
import { listOpenJobs } from '../../services/jobs'
import { useAuth } from '../../store/authContext'
import type { CompanyDetail, OpportunityCard as OpportunityCardType } from '../../types'
import { CompanyDirectory } from '../ui/CompanyDirectory'
import { OpportunityCard } from './OpportunityCard'

interface CompaniesMatchingSkillsProps {
  /** How many matching companies to surface. */
  companyLimit?: number
  /** How many open opportunities to show alongside them. */
  opportunityLimit?: number
  /** Overrides for surfaces that need different copy. */
  title?: string
  subtitle?: string
  /** Appended to the heading, e.g. after a resume is analysed. */
  eyebrow?: string
}

/**
 * "Companies & Opportunities That Match Your Skills".
 *
 * Two linked views of the same question - who is hiring, and for what:
 *
 *   1. the employers whose listings align with the student's stored skills,
 *      ordered by best alignment and labelled with their real open-role count;
 *   2. the open opportunities themselves, each with its own status, website and
 *      apply affordance.
 *
 * The wording is deliberate. This is skill alignment, not a hiring outcome: the
 * component never says the student is eligible, qualified or likely to be hired.
 */
export function CompaniesMatchingSkills({
  companyLimit = 6,
  opportunityLimit = 6,
  title = 'Companies & Opportunities That Match Your Skills',
  subtitle = 'Based on the skills identified in your resume, these opportunities have requirements that align with your profile.',
  eyebrow,
}: CompaniesMatchingSkillsProps) {
  const { status: authStatus } = useAuth()
  const isAuthenticated = authStatus === 'authenticated'

  const companies = useAsync(
    () =>
      listMatchingCompanies({ limit: companyLimit }).then(
        (response) => response.items as CompanyDetail[],
      ),
    [companyLimit],
    { enabled: isAuthenticated },
  )

  const opportunities = useAsync(
    () =>
      listOpenJobs({ sort: 'compatibility', page_size: opportunityLimit }).then(
        (response) => response.items as OpportunityCardType[],
      ),
    [opportunityLimit],
    { enabled: isAuthenticated },
  )

  if (!isAuthenticated) return null

  const loading = companies.loading || opportunities.loading
  const error = companies.error ?? opportunities.error
  const companyItems = companies.data ?? []
  const opportunityItems = opportunities.data ?? []

  return (
    <section className="space-y-5" aria-labelledby="matching-companies-heading">
      <header>
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-brand-300">
            {eyebrow}
          </p>
        )}
        <h2
          id="matching-companies-heading"
          className="font-display text-lg font-semibold tracking-tight text-white"
        >
          {title}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">{subtitle}</p>
      </header>

      {error && (
        <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="sb-glass space-y-3 rounded-2xl p-5">
              <div className="h-4 w-2/3 animate-pulse rounded bg-white/6" />
              <div className="h-3 w-full animate-pulse rounded bg-white/6" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-white/6" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Employers */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-white">
              <Building2 className="h-4 w-4 text-brand-300" aria-hidden="true" />
              Companies with Matching Roles
              <span className="text-xs font-normal text-slate-500">
                ({companyItems.length})
              </span>
            </h3>
            <CompanyDirectory companies={companyItems} />
          </div>

          {/* The roles themselves */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-white">
                <Compass className="h-4 w-4 text-brand-300" aria-hidden="true" />
                Matching Open Opportunities
                <span className="text-xs font-normal text-slate-500">
                  ({opportunityItems.length})
                </span>
              </h3>
              <Link
                to="/opportunities"
                className="text-xs font-medium text-brand-300 hover:text-brand-200"
              >
                Browse all opportunities
              </Link>
            </div>

            {opportunityItems.length === 0 ? (
              <div className="sb-glass rounded-2xl px-5 py-10 text-center">
                <h4 className="font-display text-sm font-semibold text-white">
                  No open opportunities yet
                </h4>
                <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-400">
                  Nothing in the dataset is currently stored as open for
                  applications. Browse all opportunities to see closed and
                  unverified listings.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {opportunityItems.map((opportunity) => (
                  <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}