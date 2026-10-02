import { api } from './api'

export interface LivenessResponse {
  status: string
  service: string
  version: string
  environment: string
}

export interface ReadinessResponse {
  status: string
  database: 'connected' | 'unavailable'
}

/** Process-level check: the API is running. */
export async function fetchLiveness(): Promise<LivenessResponse> {
  const { data } = await api.get<LivenessResponse>('/health')
  return data
}

/**
 * Dependency-level check: the API can reach PostgreSQL.
 * A 503 is an expected, meaningful answer here, not a transport failure, so it
 * is accepted rather than thrown.
 */
export async function fetchReadiness(): Promise<ReadinessResponse> {
  const { data } = await api.get<ReadinessResponse>('/health/ready', {
    validateStatus: (status) => status === 200 || status === 503,
  })
  return data
}
