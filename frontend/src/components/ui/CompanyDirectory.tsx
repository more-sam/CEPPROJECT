import type { CompanyDetail } from '../types'
import { Link } from 'react-router-dom'

import { Badge } from './Badge'
import { CompanyLogo } from './CompanyLogo'
import { EmptyState } from './EmptyState'

interface CompanyDirectoryProps {
  companies: CompanyDetail[]
  /** Only render companies that have at least one open listing. */
  onlyOpen?: boolean
  onSelect?: (company: CompanyDetail) => void
  emptyLabel?: string
  emptyDescription?: string
}

/**
 * Compact company directory row for the "Companies & Opportunities That Match
 * Your Skills" section. Each row is a compact card: logo, name (+industry),
 * open-opportunity count, and a link into the company detail page. Clicking the
 * logo or the name opens the official company website when it is safe to do so.
 */export function CompanyDirectory({
  companies,
  onlyOpen = true,
  onSelect,
  emptyLabel = 'No matching companies',
  emptyDescription = 'Try a different selection or upload a resume to find your match.',
}: CompanyDirectoryProps) {
  const visible = companies.filter((company) => !onlyOpen || company.open_roles > 0)

  if (visible.length === 0) {
    return (
      <EmptyState
        icon="Company"
        title={emptyLabel}
        description={emptyDescription}
      />
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map((company) => (
        <button
          key={company.id}
          type="button"
          onClick={() => onSelect?.(company)}
          className="sb-glass flex w-full flex-col gap-3 rounded-2xl p-4 text-left transition hover:border-brand-400/25"
        >
          <div className="flex items-start gap-3">
            <CompanyLogo
              companyName={company.name}
              logoUrl={company.logo_url}
              websiteUrl={company.website_url}
              size={44}
            />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-display text-sm font-semibold text-white">
                <Link
                  to={`/companies/${company.id}`}
                  className="hover:text-brand-200"
                >
                  {company.name}
                </Link>
              </h3>
              <p className="truncate text-xs text-slate-400">
                {company.location ?? 'No location on file'}
              </p>
              {company.industry && (
                <Badge tone="neutral">{company.industry}</Badge>
              )}
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/8 pt-3">
            <span className="text-[11px] text-slate-500">
              {company.open_roles} open role{company.open_roles !== 1 ? 's' : ''}
            </span>
            <Link
              to={`/companies/${company.id}`}
              className="text-[11px] font-medium text-brand-300 hover:text-brand-200"
            >
              View company
            </Link>
          </div>
        </button>
      ))}
    </div>
  )
}
