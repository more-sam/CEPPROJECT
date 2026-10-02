import type {
  ResumeAnalysis,
  ResumeSummary,
  ResumeUploadResponse,
} from '../types'
import { api } from './api'

export interface MessageResponse {
  message: string
}

/**
 * Max accepted size, mirroring the backend's `MAX_UPLOAD_SIZE_MB`.
 *
 * Checked locally so an obviously oversized file fails instantly instead of
 * after a long upload. The server stays authoritative: it enforces the real
 * limit and its message is what the student sees, so raising the server limit
 * without raising `VITE_MAX_UPLOAD_MB` still works (the browser just stops
 * short-circuiting that case).
 */
export const MAX_UPLOAD_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB ?? 5)
export const ALLOWED_EXTENSIONS = ['.pdf', '.docx']

export async function listResumes(): Promise<ResumeSummary[]> {
  const { data } = await api.get<ResumeSummary[]>('/resumes')
  return data
}

export async function getResumeAnalysis(resumeId: number): Promise<ResumeAnalysis> {
  const { data } = await api.get<ResumeAnalysis>(`/resumes/${resumeId}/analysis`)
  return data
}

export async function deleteResume(resumeId: number): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(`/resumes/${resumeId}`)
  return data
}

/**
 * Upload a resume and receive the full analysis in one round trip.
 * `onProgress` receives 0-100 so the UI can show real upload progress.
 */
export async function uploadResume(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ResumeUploadResponse> {
  const form = new FormData()
  form.append('file', file)

  const { data } = await api.post<ResumeUploadResponse>('/resumes', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) return
      onProgress(Math.round((event.loaded / event.total) * 100))
    },
    // A large PDF can take a while to parse server-side.
    timeout: 60_000,
  })
  return data
}

/** Client-side guard so an obviously wrong file never leaves the browser. */
export function validateResumeFile(file: File): string | null {
  const name = file.name.toLowerCase()
  if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return 'Only PDF and DOCX resumes are supported.'
  }
  if (file.size === 0) {
    return 'That file appears to be empty.'
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `That file is larger than the ${MAX_UPLOAD_MB} MB limit.`
  }
  return null
}

/** Pretty-print a byte count for the resume list. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
