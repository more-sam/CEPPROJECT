import type {
  AssessmentDetail,
  AssessmentHistoryItem,
  AssessmentResult,
  AssessmentSummary,
} from '../types'
import { api } from './api'

export async function listAssessments(): Promise<AssessmentSummary[]> {
  const { data } = await api.get<AssessmentSummary[]>('/assessments')
  return data
}

export async function getAssessment(assessmentId: number): Promise<AssessmentDetail> {
  const { data } = await api.get<AssessmentDetail>(`/assessments/${assessmentId}`)
  return data
}

export async function fetchAssessmentHistory(): Promise<AssessmentHistoryItem[]> {
  const { data } = await api.get<AssessmentHistoryItem[]>('/assessments/history')
  return data
}

/** Submit answers keyed by question id. */
export async function submitAssessment(
  assessmentId: number,
  answers: Record<number, string>,
): Promise<AssessmentResult> {
  const payload = {
    answers: Object.entries(answers).map(([questionId, answer]) => ({
      question_id: Number(questionId),
      answer,
    })),
  }
  const { data } = await api.post<AssessmentResult>(
    `/assessments/${assessmentId}/submit`,
    payload,
  )
  return data
}
