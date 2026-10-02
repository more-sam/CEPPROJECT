import type { AssistantCapabilities, ChatResponse } from '../types'
import { api } from './api'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export async function fetchAssistantCapabilities(): Promise<AssistantCapabilities> {
  const { data } = await api.get<AssistantCapabilities>('/assistant/capabilities')
  return data
}

/**
 * Ask the assistant. The backend grounds its answer in the student's stored
 * data and returns either an LLM reply or a deterministic local one, plus the
 * sources it used.
 */
export async function sendChatMessage(
  message: string,
  history: ChatTurn[] = [],
): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>('/assistant/chat', {
    message,
    history: history.slice(-20),
  })
  return data
}
