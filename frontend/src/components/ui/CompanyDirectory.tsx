import { Briefcase, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { CompanyDetail } from '../../types'
import { displayHost, isSafeExternalUrl } from '../../utils/links'
import { Badge } from './Badge'
import { CompanyLogo } from './CompanyLogo'

interface CompanyDirectoryProps {
  companies: CompanyDetail[]
  /** Hide employers that have no listing stored as open. */
  onlyOpen?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

/**
 * The company grid used by the "companies that match your skills" section.
 *
 * Each tile is a link into the company page, plus a separate external link for
 * the official website. The two are deliberately not nested: a link inside a
 * link is invalid markup and breaks keyboard navigation.
 *
 * `open_roles` comes straight from rows stored with status "open" - it is never
 * estimated from the total.
 */
export function CompanyDirectory({
  companies,
  onlyOpen = false,
  emptyTitle = 'No matching companies yet',
  emptyDescription = 'Upload a resume or add skills to see which employers match.',
}: CompanyDirectoryProps) {
  const visible = onlyOpen ? companies.filter((item) => item.open_roles > 0) : companies

  if (visible.length === 0) {
    return (
      <div className="sb-glass rounded-2xl px-5 py-10 text-center">
        <h3 className="font-display text-sm font-semibold text-white">{emptyTitle}</h3>
        <p className="mx-auto mt-1.5 max-w-sm text-xs text-slate-400">
          {emptyDescription}
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map((company) => {
        const website = isSafeExternalUrl(company.website_url) ? company.website_url : null
        const host = displayHost(company.website_url)

        return (
          <div
            key={company.id}
            className="sb-glass flex flex-col gap-3 rounded-2xl p-4 transition hover:border-brand-400/25"
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
                  <Link to={`/companies/${company.id}`} className="hover:text-brand-200">
                    {company.name}
                  </Link>
                </h3>
                <p className="truncate text-xs text-slate-400">
                  {company.location ?? 'Location not on file'}
                </p>
                {company.industry && (
                  <div className="mt-1.5">
                    <Badge tone="neutral">{company.industry}</Badge>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Official website:{' '}
              {website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-brand-300 hover:text-brand-200"
                >
                  {host}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              ) : (
                <span className="text-slate-500">unavailable</span>
              )}
            </p>

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/8 pt-3">
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <Briefcase className="h-3 w-3" aria-hidden="true" />
                {company.open_roles} open
                <span className="text-slate-600">/ {company.total_roles} total</span>
              </span>
              <Link
                to={`/companies/${company.id}`}
                className="text-[11px] font-medium text-brand-300 hover:text-brand-200"
              >
                View company
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}