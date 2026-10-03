import { SlidersHorizontal, X } from 'lucide-react'

import type { JobFilterOptions, JobQuery } from '../../types'

const WORK_TYPE_LABEL: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
}

const EMPLOYMENT_LABEL: Record<string, string> = {
  internship: 'Internship',
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
}

export interface FilterState extends JobQuery {
  min_compatibility: number
}

interface FilterPanelProps {
  options: JobFilterOptions | null
  value: FilterState
  onChange: (next: FilterState) => void
  /** Hide the compatibility filter for signed-out visitors - it would be null. */
  showCompatibility?: boolean
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
        active
          ? 'bg-brand-500/20 text-brand-200 ring-1 ring-brand-400/30'
          : 'border border-white/10 bg-white/5 text-slate-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}

export function FilterPanel({
  options,
  value,
  onChange,
  showCompatibility = false,
}: FilterPanelProps) {
  const patch = (next: Partial<FilterState>) =>
    onChange({ ...value, ...next, page: 1 })

  // Any set filter counts as "active" so the reset control can appear.
  const activeCount = [
    value.location,
    value.employment_type,
    value.work_type,
    value.experience_level,
    value.skill,
    value.status,
    value.company_id,
  ].filter(Boolean).length

  return (
    <section className="sb-glass space-y-4 rounded-2xl p-5" aria-label="Filters">
      <div className="flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 font-display text-sm font-semibold text-white">
          <SlidersHorizontal className="h-4 w-4 text-brand-300" />
          Filters
        </h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                location: undefined,
                employment_type: undefined,
                work_type: undefined,
                experience_level: undefined,
                skill: undefined,
                status: undefined,
                company_id: undefined,
                page: 1,
              })
            }
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
          >
            <X className="h-3 w-3" />
            Clear ({activeCount})
          </button>
        )}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Employment type
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(options?.employment_types ?? []).map((type) => (
            <Chip
              key={type}
              label={EMPLOYMENT_LABEL[type] ?? type}
              active={value.employment_type === type}
              onClick={() =>
                patch({ employment_type: value.employment_type === type ? undefined : type })
              }
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Work type
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(options?.work_types ?? []).map((type) => (
            <Chip
              key={type}
              label={WORK_TYPE_LABEL[type] ?? type}
              active={value.work_type === type}
              onClick={() => patch({ work_type: value.work_type === type ? undefined : type })}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Experience
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(options?.experience_levels ?? []).map((level) => (
            <Chip
              key={level}
              label={level}
              active={value.experience_level === level}
              onClick={() =>
                patch({ experience_level: value.experience_level === level ? undefined : level })
              }
            />
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="filter-location"
          className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-slate-500"
        >
          Location
        </label>
        <select
          id="filter-location"
          value={value.location ?? ''}
          onChange={(event) => patch({ location: event.target.value || undefined })}
          className="w-full rounded-xl border border-white/10 bg-ink-850 px-3 py-2 text-xs text-slate-300 focus:border-brand-400/40 focus:outline-none"
        >
          <option value="">Any location</option>
          {(options?.locations ?? []).map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </div>

      {/* Company dropdown: every employer with at least one listing. */}
      {options?.companies && options.companies.length > 0 && (
        <div>
          <label
            htmlFor="filter-company"
            className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-slate-500"
          >
            Company
          </label>
          <select
            id="filter-company"
            value={value.company_id ?? ''}
            onChange={(event) =>
              patch({
                company_id: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              })
            }
            className="w-full rounded-xl border border-white/10 bg-ink-850 px-3 py-2 text-xs text-slate-300 focus:border-brand-400/40 focus:outline-none"
          >
            <option value="">Any company</option>
            {options.companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Status filter: the four stored states. "open" strongly filtered. */}
      {options?.statuses && options.statuses.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Application status
          </p>
          <div className="flex flex-wrap gap-1.5">
            {options.statuses.map((s) => (
              <Chip
                key={s}
                label={s === 'open' ? 'Open' : s === 'closed' ? 'Closed' : s === 'expired' ? 'Expired' : 'Unknown'}
                active={value.status === s}
                onClick={() =>
                  patch({ status: value.status === s ? undefined : (s as typeof value.status) })
                }
              />
            ))}
          </div>
        </div>
      )}

      {showCompatibility && (
        <div>
          <label
            htmlFor="filter-compatibility"
            className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-slate-500"
          >
            Minimum compatibility: {value.min_compatibility}%
          </label>
          <input
            id="filter-compatibility"
            type="range"
            min={0}
            max={90}
            step={10}
            value={value.min_compatibility}
            onChange={(event) => patch({ min_compatibility: Number(event.target.value) })}
            className="w-full accent-brand-500"
          />
        </div>
      )}
    </section>
  )
}
