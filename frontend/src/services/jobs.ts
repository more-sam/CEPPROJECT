import type {
  JobFilterOptions,
  JobQuery,
  OpportunityCard,
  OpportunityDetail,
  Paginated,
} from '../types'
import { api } from './api'

export const DEFAULT_PAGE_SIZE = 12

/**
 * List opportunities. Works for anonymous visitors too - compatibility fields
 * come back null rather than being invented client-side.
 */
export async function listJobs(query: JobQuery = {}): Promise<Paginated<OpportunityCard>> {
  const params: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params[key] = value as string | number
  }

  const { data } = await api.get<Paginated<OpportunityCard>>('/jobs', { params })
  return data
}

/**
 * Opportunities whose stored `status` is `open`.
 *
 * The filter lives on the server, so this can only ever return rows the
 * database actually marks as open - it is not a client-side guess.
 */
export async function listOpenJobs(
  query: JobQuery = {},
): Promise<Paginated<OpportunityCard>> {
  const params: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params[key] = value as string | number
  }

  const { data } = await api.get<Paginated<OpportunityCard>>('/jobs/open', { params })
  return data
}

export async function getJob(jobId: number): Promise<OpportunityDetail> {
  const { data } = await api.get<OpportunityDetail>(`/jobs/${jobId}`)
  return data
}

export async function getSimilarJobs(jobId: number, limit = 4): Promise<OpportunityCard[]> {
  const { data } = await api.get<OpportunityCard[]>(`/jobs/${jobId}/similar`, {
    params: { limit },
  })
  return data
}

export async function getJobFilters(): Promise<JobFilterOptions> {
  const { data } = await api.get<JobFilterOptions>('/jobs/filters')
  return data
}
