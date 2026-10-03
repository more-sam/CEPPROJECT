import { Link } from 'react-router-dom'

import { EmptyState } from '../ui/EmptyState'
import { PageHeader } from '../ui/PageHeader'
import { CompanyDirectory } from './CompanyDirectory'
import { OpportunityCard } from '../opportunities/OpportunityCard'
import type { CompanyDetail, OpportunityCard as OpportunityCardType } from '../types'

/**
 * "Companies & Opportunities That Match Your Skills" section.
 *
 * Two columns of content:
 *
 *   1. A company directory of every matched company, each with its industry,
 *      open-opportunity count and a link into the company detail page.
 *   2. An opportunity grid for the same set, rendered with the upgraded
 *      OpportunityCard (compatibility, matched/missing skills, status, apply).
 *
 * The section is only rendered after a resume has been analysed and the
 * backend has returned `companies` / `open_opportunities`, which only happens
 * for a signed-in student with a matching profile.
 */export interface CompaniesMatchingSkillsProps {
  companies: CompanyDetail[]
  open_opportunities: OpportunityCardType[]
  loading: boolean
  /** Called when the user taps a company to open its detail page. */
  onCompanySelect?: (company: CompanyDetail) => void
}

export function CompaniesMatchingSkills({
  companies,
  open_opportunities,
  loading,
  onCompanySelect,
}: CompaniesMatchingSkillsProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 animate-pulse rounded bg-white/6" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="sb-glass space-y-3 rounded-2xl p-5">
            <div className="h-4 w-2/3 animate-pulse rounded" />
            <div className="h-3 w-full animate-pulse rounded" />
          </div>
          <div className="sb-glass space-y-3 rounded-2xl p-5">
            <div className="h-4 w-2/3 animate-pulse rounded" />
            <div className="h-3 w-full animate-pulse rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Companies & opportunities that match your skills"
        subtitle="Every employer in your results, with the roles they are still hiring for."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,280px)_1fr]">
        {/* Company directory */}
        <div className="sb-glass rounded-2xl p-5">
          <h3 className="font-display text-sm font-semibold text-white">
            Companies
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            {companies.length} companies in your matching set
          </p>

          {companies.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              No companies were matched to your skills yet. Upload a resume to
              find your match.
            </p>
          ) : (
            <CompanyDirectory
              companies={companies}
              onSelect={onCompanySelect}
            />
          )}
        </div>

        {/* Opportunities grid */}
        <div className="sb-glass flex flex-col rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-white">
              Open opportunities
            </h3>
            <Link
              to="/opportunities"
              className="text-xs font-medium text-brand-300 hover:text-brand-200"
            >
              View all
            </Link>
          </div>

          {open_opportunities.length === 0 ? (
            <EmptyState
              icon="Compass"
              title="Nothing matched yet"
              description="All of the opportunities above were matched to your skills by SkillBridge. Try a different resume or upload more skills."
            />
          ) : (
            <div className="flex-1 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {open_opportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
