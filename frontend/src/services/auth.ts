import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
} from '../types'
import { api } from './api'

export interface MessageResponse {
  message: string
}

/** The always-200 session probe used to bootstrap auth state. */
export interface SessionProbe {
  authenticated: boolean
  user: User | null
  has_profile: boolean
}

/**
 * Sign in. The backend sets an httpOnly cookie, so nothing auth-related is
 * returned to JavaScript beyond the user record itself.
 */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', payload)
  return data
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', payload)
  return data
}

export async function logout(): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>('/auth/logout')
  return data
}

/**
 * Discover the current session. Called once on startup, because an httpOnly
 * cookie cannot be inspected from the browser.
 *
 * Uses the session probe rather than `/auth/me` so a signed-out visitor gets a
 * 200 with `authenticated: false` instead of a 401 in the console.
 */
export async function fetchSession(): Promise<SessionProbe> {
  const { data } = await api.get<SessionProbe>('/auth/session')
  return data
}

/** Strict current-user lookup; throws 401 when there is no session. */
export async function fetchCurrentUser(): Promise<AuthResponse> {
  const { data } = await api.get<AuthResponse>('/auth/me')
  return data
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>('/auth/password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
  return data
}

export async function deleteAccount(password: string): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>('/auth/account', {
    data: { password },
  })
  return data
}
