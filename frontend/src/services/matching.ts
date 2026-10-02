import type {
  MatchResponse,
  OpportunityCard,
  RecommendationResponse,
  SavedJob,
  SkillGapResponse,
} from '../types'
import { api } from './api'

export interface MessageResponse {
  message: string
}

export interface RecommendationQuery {
  limit?: number
  min_compatibility?: number
  location?: string
  employment_type?: string
  work_type?: string
}

export async function fetchRecommendations(
  query: RecommendationQuery = {},
): Promise<RecommendationResponse> {
  const { data } = await api.get<RecommendationResponse>('/matching/recommendations', {
    params: query,
  })
  return data
}

/** Score the signed-in student against one opportunity. */
export async function analyzeJob(jobId: number): Promise<MatchResponse> {
  const { data } = await api.post<MatchResponse>('/matching/analyze', { job_id: jobId })
  return data
}

export async function fetchMatch(jobId: number): Promise<MatchResponse> {
  const { data } = await api.get<MatchResponse>(`/matching/${jobId}`)
  return data
}

/** Aggregate gaps across the student's recommended opportunities. */
export async function fetchOverallSkillGap(): Promise<SkillGapResponse> {
  const { data } = await api.get<SkillGapResponse>('/skill-gap')
  return data
}

export async function fetchSkillGapForJob(jobId: number): Promise<SkillGapResponse> {
  const { data } = await api.get<SkillGapResponse>(`/skill-gap/${jobId}`)
  return data
}

export async function fetchSavedJobs(): Promise<SavedJob[]> {
  const { data } = await api.get<SavedJob[]>('/saved-jobs')
  return data
}

export async function saveJob(jobId: number): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>(`/saved-jobs/${jobId}`)
  return data
}

export async function unsaveJob(jobId: number): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(`/saved-jobs/${jobId}`)
  return data
}

/** Convenience for the save/unsave toggle used on every opportunity card. */
export async function toggleSavedJob(
  jobId: number,
  currentlySaved: boolean,
): Promise<boolean> {
  if (currentlySaved) {
    await unsaveJob(jobId)
    return false
  }
  await saveJob(jobId)
  return true
}

/** Card-shaped type alias, re-exported for convenience at call sites. */
export type { OpportunityCard }
