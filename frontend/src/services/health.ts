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

export interface PlatformStats {
  status: 'ok' | 'degraded'
  jobs?: number
  skills?: number
  companies?: number
  assessments?: number
}

/**
 * Public platform counters for the landing page (no authentication).
 * A 503 means the database is unreachable and is treated as "no data" so the
 * stats band can hide itself instead of rendering zeros.
 */
export async function fetchPlatformStats(): Promise<PlatformStats> {
  const { data } = await api.get<PlatformStats>('/stats', {
    validateStatus: (status) => status === 200 || status === 503,
  })
  return data
}
