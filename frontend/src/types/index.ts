/**
 * Shared API types.
 *
 * These mirror the backend Pydantic schemas. Notably, `storage_path` is absent
 * from the resume types because the API never exposes it, and
 * `compatibilityScore` is nullable because an anonymous visitor has no skill set
 * to score against.
 */

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export interface User {
  id: number
  email: string
  is_active: boolean
  created_at: string
}

export interface AuthResponse {
  message: string
  user: User
  has_profile: boolean
}

export interface RegisterPayload {
  email: string
  password: string
  full_name?: string
}

export interface LoginPayload {
  email: string
  password: string
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
export type WorkType = 'remote' | 'hybrid' | 'onsite'
export type Proficiency = 'unknown' | 'beginner' | 'intermediate' | 'advanced'

export interface Profile {
  id: number
  full_name: string | null
  college: string | null
  degree: string | null
  branch: string | null
  graduation_year: number | null
  preferred_roles: string[]
  preferred_locations: string[]
  work_type: WorkType | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface StudentSkill {
  id: number
  skill_id: number
  name: string
  slug: string
  category: string
  proficiency: Proficiency
  confidence: number
  source: string
}

export interface SkillCatalogueItem {
  id: number
  name: string
  slug: string
  category: string
  description: string | null
}

// ---------------------------------------------------------------------------
// Resume
// ---------------------------------------------------------------------------
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ResumeSummary {
  id: number
  filename: string
  file_type: string
  file_size_bytes: number
  analysis_status: AnalysisStatus
  analysis_error: string | null
  skill_count: number
  uploaded_at: string
}

export interface DetectedSkill {
  name: string
  slug: string
  category: string
  confidence: number
  occurrences: number
  evidence: 'exact' | 'alias' | 'lemma'
  saved: boolean
}

export interface ResumeAnalysis {
  resume: ResumeSummary
  detected_skills: DetectedSkill[]
  skills_by_category: Record<string, string[]>
  sections_found: string[]
  section_previews: Record<string, string[]>
  word_count: number
  warnings: string[]
  detected_name: string | null
  detected_email: string | null
  top_opportunities: OpportunityCard[]
}

export interface ResumeUploadResponse {
  message: string
  analysis: ResumeAnalysis
}

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------
export type EmploymentType = 'internship' | 'full_time' | 'part_time' | 'contract'
export type ExperienceLevel = 'intern' | 'entry' | 'mid' | 'senior'

export type ApplicationStatus = 'open' | 'closed' | 'expired' | 'unknown'

export interface CompanySummary {
  id: number
  name: string
  description: string | null
  logo_url: string | null
  website_url: string | null
  location: string | null
  industry: string | null
  initials: string
}

export interface RequiredSkill {
  name: string
  slug: string
  category: string
  importance: 'low' | 'medium' | 'high'
}

export interface SemanticMatch {
  student_skill: string
  job_skill: string
  similarity: number
  explanation: string
}

export interface OpportunityCard {
  id: number
  title: string
  location: string
  employment_type: EmploymentType
  work_type: WorkType
  experience_level: ExperienceLevel
  /** Provenance. Seeded rows always say "DEMO" so the UI can label them. */
  source: string
  /**
   * Application status as stored: open | closed | expired | unknown.
   * `unknown` is honest by design - a stored row alone does not prove that
   * applications are still being accepted, so the UI must never upgrade it to
   * "open".
   */
  status: ApplicationStatus
  posted_at: string | null
  /** Closing date, when the stored status gives one. */
  expires_at: string | null
  /** Set only when a real source confirmed the listing. Null for demo rows. */
  last_verified_at: string | null
  company: CompanySummary
  required_skills: RequiredSkill[]
  /** Empty when the employer has no application page we can link to. */
  application_url: string
  /** Null when browsing anonymously. */
  compatibility_score: number | null
  matched_skills: string[]
  missing_skills: string[]
  semantic_matches: SemanticMatch[]
  reasons: string[]
  is_saved: boolean
}

export interface SkillBreakdownEntry {
  skill: string
  slug: string
  category: string
  importance: string
  weight: number
  relation: 'exact' | 'semantic' | 'missing'
  matched: boolean
}

export interface OpportunityDetail extends OpportunityCard {
  description: string
  application_url: string
  requirements_text: string | null
  skill_breakdown: SkillBreakdownEntry[]
  weighted_score: number | null
  semantic_score: number | null
}

export interface PageMeta {
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

export interface Paginated<T> {
  items: T[]
  meta: PageMeta
}

export interface JobFilterOptions {
  locations: string[]
  employment_types: string[]
  work_types: string[]
  experience_levels: string[]
  categories: string[]
  // Application statuses actually present (e.g. ["open", "closed"]).
  statuses: string[]
  // Companies that have at least one listing, for the company filter.
  companies: { id: number; name: string }[]
}

export interface JobQuery {
  q?: string
  location?: string
  employment_type?: string
  work_type?: string
  experience_level?: string
  skill?: string
  min_compatibility?: number
  status?: ApplicationStatus
  company_id?: number
  sort?: 'newest' | 'compatibility' | 'relevance' | 'title'
  page?: number
  page_size?: number
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------
export interface MatchResponse {
  job_id: number
  job_title: string
  company_name: string
  compatibility_score: number
  weighted_score: number
  semantic_score: number
  combined_score: number
  total_required: number
  matched_skills: string[]
  missing_skills: string[]
  additional_skills: string[]
  semantic_matches: SemanticMatch[]
  skill_breakdown: SkillBreakdownEntry[]
  reasons: string[]
  disclaimer: string
}

export interface RecommendationResponse {
  items: OpportunityCard[]
  total: number
  note: string | null
}

export interface SavedJob {
  id: number
  job_id: number
  created_at: string
  job: OpportunityCard | null
}

// ---------------------------------------------------------------------------
// Skill gap
// ---------------------------------------------------------------------------
export interface SkillGapItem {
  name: string
  slug: string
  category: string
  importance: string
  opportunities_requiring: number
  why_it_matters: string
  in_roadmap: boolean
}

export interface SkillGapResponse {
  job_id: number | null
  job_title: string | null
  company_name: string | null
  available: SkillGapItem[]
  developing: SkillGapItem[]
  missing: SkillGapItem[]
  compatibility_score: number
  total_required: number
  /** What the figures were computed against, in words. */
  scope: string
  note: string | null
}

// ---------------------------------------------------------------------------
// Roadmap
// ---------------------------------------------------------------------------
export type RoadmapStatus = 'not_started' | 'in_progress' | 'completed'

export interface RoadmapItem {
  id: number
  order_index: number
  priority: 'high' | 'medium' | 'low'
  status: RoadmapStatus
  estimated_hours: number
  reason: string
  prerequisites: string[]
  resources: { title: string; url: string }[]
  skill_id: number
  skill_name: string
  skill_slug: string
  skill_category: string
}

export interface Roadmap {
  id: number
  title: string
  description: string | null
  source: string
  target_job_id: number | null
  target_job_title: string | null
  created_at: string
  updated_at: string
  items: RoadmapItem[]
  total_items: number
  completed_items: number
  in_progress_items: number
  total_hours: number
  completed_hours: number
  progress_percentage: number
}

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------
export interface AssessmentSummary {
  id: number
  title: string
  description: string | null
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  question_count: number
  pass_score: number
  skill_id: number
  skill_name: string
  skill_slug: string
  skill_category: string
  best_score: number | null
  attempts: number
  passed: boolean
}

export interface AssessmentQuestion {
  id: number
  question: string
  options: string[]
  order_index: number
}

export interface AssessmentDetail {
  id: number
  title: string
  description: string | null
  difficulty: string
  pass_score: number
  skill_name: string
  skill_slug: string
  skills_tested: string[]
  questions: AssessmentQuestion[]
}

export interface AssessmentReviewItem {
  question_id: number
  question: string
  given: string
  correct: string
  is_correct: boolean
  explanation: string
}

export interface AssessmentResult {
  id: number
  assessment_id: number
  assessment_title: string
  skill_name: string
  skill_slug: string
  score: number
  correct_count: number
  total_count: number
  passed: boolean
  pass_score: number
  completed_at: string
  review: AssessmentReviewItem[]
  progress_updated: boolean
  progress_percentage: number
  new_skills_added: string[]
}

export interface AssessmentHistoryItem {
  id: number
  assessment_id: number
  assessment_title: string
  skill_name: string
  score: number
  passed: boolean
  completed_at: string
}

// ---------------------------------------------------------------------------
// Progress and dashboard
// ---------------------------------------------------------------------------
export interface ProgressItem {
  skill_id: number
  skill_name: string
  skill_slug: string
  category: string
  progress_percentage: number
  status: 'not_started' | 'developing' | 'mastered'
  best_assessment_score: number | null
  assessments_taken: number
  updated_at: string
}

export interface ProgressOverview {
  total_skills: number
  mastered: number
  developing: number
  not_started: number
  roadmap_items_total: number
  roadmap_items_completed: number
  roadmap_progress_percentage: number
  assessments_taken: number
  assessments_passed: number
  average_assessment_score: number
  total_learning_hours: number
  completed_learning_hours: number
  items: ProgressItem[]
  score_history: { date: string; score: number; label: string }[]
  category_breakdown: {
    category: string
    mastered: number
    developing: number
    not_started: number
  }[]
}

export interface DashboardMetric {
  label: string
  value: number
  suffix: string
  hint: string
}

export interface SkillConstellationNode {
  name: string
  slug: string
  category: string
  state: 'owned' | 'learning' | 'gap'
}

export interface ActivityEntry {
  kind: 'resume' | 'assessment' | 'roadmap' | 'saved_job'
  title: string
  detail: string
  occurred_at: string
}

export interface OnboardingStep {
  key: string
  label: string
  done: boolean
}

export interface Dashboard {
  greeting_name: string
  has_profile: boolean
  has_resume: boolean
  has_skills: boolean
  skills_identified: number
  skills_by_category: { category: string; count: number }[]
  opportunities_matched: number
  skill_gaps: number
  roadmap_progress_percentage: number
  average_compatibility: number
  metrics: DashboardMetric[]
  recommendations: OpportunityCard[]
  skill_constellation: SkillConstellationNode[]
  recent_activity: ActivityEntry[]
  roadmap_preview: {
    id: number
    skill: string
    priority: string
    status: RoadmapStatus
    estimated_hours: number
    reason: string
  }[]
  saved_jobs: {
    id: number
    title: string
    company: string
    company_initials: string
    location: string
  }[]
  onboarding_steps: OnboardingStep[]
  recommendation_note: string | null
}

// ---------------------------------------------------------------------------
// Assistant
// ---------------------------------------------------------------------------
export interface ChatSource {
  label: string
  detail: string
}

export interface ChatResponse {
  reply: string
  mode: 'local' | 'llm'
  sources: ChatSource[]
  suggested_prompts: string[]
  created_at: string
}

export interface AssistantCapabilities {
  llm_enabled: boolean
  provider: string
  model: string | null
  note: string
  suggested_prompts: string[]
}

// ---------------------------------------------------------------------------
// Company detail
// ---------------------------------------------------------------------------
export interface CompanyDetail {
  id: number
  name: string
  description: string | null
  logo_url: string | null
  /** Null when no verified website is on file - never a fabricated URL. */
  website_url: string | null
  location: string | null
  industry: string | null
  initials: string
  /** Counted strictly from rows stored with status "open". */
  open_roles: number
  total_roles: number
}

export interface CompanyDirectoryResponse {
  items: CompanyDetail[]
  total: number
}

/** A company's listings, open-only or all, as returned by the company endpoints. */
export interface CompanyJobsResponse {
  items: OpportunityCard[]
  meta: PageMeta
}
