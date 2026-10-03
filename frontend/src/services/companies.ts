import type { CompanyDetail, CompanyJobsResponse, JobQuery, OpportunityCard, PageMeta } from '../types'
import { api } from './api'

/** GET /companies/{id} -> CompanyDetail */
export async function fetchCompany(id: number): Promise<CompanyDetail> {
  const { data } = await api.get<CompanyDetail>(`/companies/${id}`)
  return data
}

/** GET /companies/{id}/open-jobs -> { items: OpportunityCard[], meta: PageMeta } */
export async function listCompanyJobs(
  id: number,
  query: JobQuery = {},
): Promise<CompanyJobsResponse> {
  const params: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params[key] = value
  }
  params.status = 'open'

  const { data } = await api.get<CompanyJobsResponse>(`/companies/${id}/open-jobs`, {
    params,
  })
  return data
}
