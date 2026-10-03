import type {
  CompanyDetail,
  CompanyDirectoryResponse,
  JobQuery,
  OpportunityCard,
  Paginated,
} from '../types'
import { api } from './api'

/** Strip empty values so they never become `?status=&company_id=` noise. */
function toParams(query: JobQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params[key] = value as string | number
  }
  return params
}

/** GET /companies - every company with at least one listing. */
export async function listCompanies(
  options: { onlyOpen?: boolean; q?: string } = {},
): Promise<CompanyDirectoryResponse> {
  const params: Record<string, string | boolean> = {}
  if (options.onlyOpen) params.only_open = true
  if (options.q) params.q = options.q

  const { data } = await api.get<CompanyDirectoryResponse>('/companies', { params })
  return data
}

/**
 * GET /companies/matching - companies whose listings align with the signed-in
 * student's stored skills, best alignment first.
 *
 * Requires a signed-in student; the backend rejects anonymous callers rather
 * than returning an unscored list that would look like a match.
 */
export async function listMatchingCompanies(
  options: { onlyOpen?: boolean; minCompatibility?: number; limit?: number } = {},
): Promise<CompanyDirectoryResponse> {
  const params: Record<string, string | number | boolean> = {}
  if (options.onlyOpen) params.only_open = true
  if (options.minCompatibility !== undefined) {
    params.min_compatibility = options.minCompatibility
  }
  if (options.limit !== undefined) params.limit = options.limit

  const { data } = await api.get<CompanyDirectoryResponse>('/companies/matching', {
    params,
  })
  return data
}

/** GET /companies/{id} - one company plus its open/total role counts. */
export async function fetchCompany(id: number): Promise<CompanyDetail> {
  const { data } = await api.get<CompanyDetail>(`/companies/${id}`)
  return data
}

/**
 * GET /companies/{id}/open-jobs - only this company's listings stored as open.
 */
export async function listCompanyOpenJobs(
  id: number,
  query: JobQuery = {},
): Promise<Paginated<OpportunityCard>> {
  const { data } = await api.get<Paginated<OpportunityCard>>(
    `/companies/${id}/open-jobs`,
    { params: toParams(query) },
  )
  return data
}

/** GET /companies/{id}/jobs - every listing for a company, including closed. */
export async function listCompanyJobs(
  id: number,
  query: JobQuery = {},
): Promise<Paginated<OpportunityCard>> {
  const { data } = await api.get<Paginated<OpportunityCard>>(`/companies/${id}/jobs`, {
    params: toParams(query),
  })
  return data
}