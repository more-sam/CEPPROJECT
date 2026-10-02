import type { Profile, StudentSkill, SkillCatalogueItem } from '../types'
import { api } from './api'

export interface ProfileUpdatePayload {
  full_name?: string | null
  college?: string | null
  degree?: string | null
  branch?: string | null
  graduation_year?: number | null
  preferred_roles?: string[]
  preferred_locations?: string[]
  work_type?: string | null
  bio?: string | null
}

export interface StudentSkillPayload {
  skill_name: string
  proficiency?: string
}

export interface MessageResponse {
  message: string
}

export async function fetchProfile(): Promise<Profile> {
  const { data } = await api.get<Profile>('/profile')
  return data
}

export async function updateProfile(payload: ProfileUpdatePayload): Promise<Profile> {
  const { data } = await api.put<Profile>('/profile', payload)
  return data
}

export async function fetchStudentSkills(): Promise<StudentSkill[]> {
  const { data } = await api.get<StudentSkill[]>('/profile/skills')
  return data
}

export async function addStudentSkill(payload: StudentSkillPayload): Promise<StudentSkill> {
  const { data } = await api.post<StudentSkill>('/profile/skills', payload)
  return data
}

/** Replace the entire skill set - used by the profile skill editor. */
export async function replaceStudentSkills(
  skills: StudentSkillPayload[],
): Promise<StudentSkill[]> {
  const { data } = await api.put<StudentSkill[]>('/profile/skills', skills)
  return data
}

export async function updateStudentSkill(
  studentSkillId: number,
  proficiency: string,
): Promise<StudentSkill> {
  const { data } = await api.put<StudentSkill>(`/profile/skills/${studentSkillId}`, {
    proficiency,
  })
  return data
}

export async function removeStudentSkill(studentSkillId: number): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(`/profile/skills/${studentSkillId}`)
  return data
}

/** The controlled taxonomy, for the skill picker / autocomplete. */
export async function fetchSkillCatalogue(category?: string): Promise<SkillCatalogueItem[]> {
  const { data } = await api.get<SkillCatalogueItem[]>('/skills', {
    params: category ? { category } : undefined,
  })
  return data
}

export async function fetchSkillCategories(): Promise<string[]> {
  const { data } = await api.get<string[]>('/skills/categories')
  return data
}
