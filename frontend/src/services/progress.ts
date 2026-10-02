import type { Dashboard, ProgressItem, ProgressOverview } from '../types'
import { api } from './api'

export async function fetchProgressOverview(): Promise<ProgressOverview> {
  const { data } = await api.get<ProgressOverview>('/progress')
  return data
}

export async function setSkillProgress(
  skillId: number,
  progressPercentage: number,
): Promise<ProgressItem> {
  const { data } = await api.put<ProgressItem>(`/progress/${skillId}`, {
    progress_percentage: progressPercentage,
  })
  return data
}

/** Everything the dashboard renders, in one request. */
export async function fetchDashboard(): Promise<Dashboard> {
  const { data } = await api.get<Dashboard>('/dashboard')
  return data
}
