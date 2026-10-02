import type { Roadmap, RoadmapItem, RoadmapStatus } from '../types'
import { api } from './api'

export interface MessageResponse {
  message: string
}

export async function listRoadmaps(): Promise<Roadmap[]> {
  const { data } = await api.get<Roadmap[]>('/roadmaps')
  return data
}

/** Generate a roadmap, optionally targeted at one opportunity's gaps. */
export async function createRoadmap(jobId?: number, title?: string): Promise<Roadmap> {
  const { data } = await api.post<Roadmap>('/roadmaps', {
    job_id: jobId ?? null,
    title: title ?? null,
  })
  return data
}

export async function getRoadmap(roadmapId: number): Promise<Roadmap> {
  const { data } = await api.get<Roadmap>(`/roadmaps/${roadmapId}`)
  return data
}

export async function updateRoadmapItem(
  roadmapId: number,
  itemId: number,
  status: RoadmapStatus,
): Promise<RoadmapItem> {
  const { data } = await api.put<RoadmapItem>(`/roadmaps/${roadmapId}/items/${itemId}`, {
    status,
  })
  return data
}

export async function deleteRoadmap(roadmapId: number): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(`/roadmaps/${roadmapId}`)
  return data
}
