import axios, { AxiosError } from 'axios'

/**
 * Single place where the backend location is configured.
 * Falls back to the local API so `npm run dev` works with no .env file.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

/** Every backend route lives under this prefix (mirrors app.core.config). */
export const API_PREFIX = '/api'

export const api = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
  // The access token travels in an httpOnly cookie, so every request must opt in
  // to sending credentials. The token is never readable from JavaScript.
  withCredentials: true,
})

/** Shape of the error envelope the backend returns. */
export interface ApiErrorBody {
  detail?: string | { msg?: string }[]
}

/**
 * Turn any thrown value into a message safe to show a student.
 * Never surfaces stack traces or raw network internals.
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isCancel(error)) return 'Request cancelled.'

  if (error instanceof AxiosError) {
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return 'That request took too long. Please try again.'
      }
      return `Cannot reach the SkillBridge API at ${API_BASE_URL}. Is the backend running?`
    }

    const { status, data } = error.response

    // FastAPI validation errors arrive as a list; keep only the messages.
    const detail = (data as ApiErrorBody | undefined)?.detail
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => item?.msg)
        .filter((msg): msg is string => Boolean(msg))
      if (messages.length) return messages.join(', ')
    }
    if (typeof detail === 'string' && detail) return detail

    if (status === 401) return 'Your session has expired. Please sign in again.'
    if (status === 403) return 'You do not have access to this resource.'
    if (status === 404) return 'That resource could not be found.'
    if (status === 413) return 'That file is too large.'
    if (status === 503) return 'The server is temporarily unavailable. Please try again.'
    if (status >= 500) return 'The server ran into a problem. Please try again.'
    return `Request failed (HTTP ${status}).`
  }

  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

/** True when the failure was an authentication problem (401). */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 401
}
