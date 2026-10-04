import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Sparkles,
  Trash2,
  UploadCloud,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { CompaniesMatchingSkills } from '../components/opportunities/CompaniesMatchingSkills'
import { OpportunityCard } from '../components/opportunities/OpportunityCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState, InlineError } from '../components/ui/ErrorState'
import { PageHeader } from '../components/ui/PageHeader'
import { SkillChip } from '../components/ui/SkillChip'
import { useAsync } from '../hooks/useAsync'
import { getApiErrorMessage } from '../services/api'
import {
  MAX_UPLOAD_MB,
  deleteResume,
  formatBytes,
  getResumeAnalysis,
  listResumes,
  uploadResume,
  validateResumeFile,
} from '../services/resume'
import type { AnalysisStatus, ResumeAnalysis as ResumeAnalysisType } from '../types'

/** Staged copy shown while the backend works. */
const STAGES = [
  { label: 'Reading document', detail: 'Parsing PDF/DOCX structure' },
  { label: 'Extracting experience', detail: 'Identifying roles, projects, education' },
  { label: 'Identifying skills', detail: 'Mapping to skill taxonomy' },
  { label: 'Building skill profile', detail: 'Scoring proficiency & confidence' },
  { label: 'Finding opportunities', detail: 'Matching against live roles' },
] as const

const STATUS_TONE: Record<AnalysisStatus, 'success' | 'warn' | 'danger' | 'neutral'> = {
  completed: 'success',
  processing: 'warn',
  pending: 'neutral',
  failed: 'danger',
}

export default function ResumeAnalysis() {
  const resumesState = useAsync(listResumes, [])
  const [analysis, setAnalysis] = useState<ResumeAnalysisType | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stageIndex, setStageIndex] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const resumes = resumesState.data ?? []

  const loadAnalysis = useCallback(async (resumeId: number) => {
    setAnalysisLoading(true)
    setAnalysisError(null)
    try {
      setAnalysis(await getResumeAnalysis(resumeId))
    } catch (caught) {
      setAnalysisError(getApiErrorMessage(caught))
    } finally {
      setAnalysisLoading(false)
    }
  }, [])

  // On first load, show the most recent completed analysis automatically.
  useEffect(() => {
    if (analysis !== null) return
    const latest = resumes.find((resume) => resume.analysis_status === 'completed')
    if (latest) void loadAnalysis(latest.id)
  }, [resumes, analysis, loadAnalysis])

  // Cycle the staged messages while an upload is in flight.
  useEffect(() => {
    if (!uploading) return
    const timer = window.setInterval(
      () => setStageIndex((index) => Math.min(index + 1, STAGES.length - 1)),
      1400,
    )
    return () => window.clearInterval(timer)
  }, [uploading])

  const handleFile = async (file: File) => {
    const validationError = validateResumeFile(file)
    if (validationError) {
      setUploadError(validationError)
      return
    }

    setUploadError(null)
    setStatusMessage(null)
    setUploading(true)
    setProgress(0)
    setStageIndex(0)

    try {
      const result = await uploadResume(file, setProgress)
      setAnalysis(result.analysis)
      setAnalysisError(null)
      setStatusMessage(result.message)
      resumesState.reload()
    } catch (caught) {
      setUploadError(getApiErrorMessage(caught))
    } finally {
      setUploading(false)
    }
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void handleFile(file)
    event.target.value = ''
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  const handleDelete = async (resumeId: number) => {
    setUploadError(null)
    try {
      await deleteResume(resumeId)
      if (analysis?.resume.id === resumeId) setAnalysis(null)
      resumesState.reload()
    } catch (caught) {
      setUploadError(getApiErrorMessage(caught))
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Resume Analysis"
        subtitle="Upload a PDF or DOCX. We extract your skills and match them against real opportunities."
      />

      {/* Upload Zone */}
      <section>
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`sb-glass rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-300 relative overflow-hidden ${
            dragging ? 'border-brand-400/60 bg-brand-500/5' : 'border-surface-border'
          }`}
        >
          {/* Background scanline animation */}
          {uploading && (
            <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
              <div
                className="absolute inset-x-0 top-0 h-[200%] bg-gradient-to-b from-transparent via-brand-500/10 to-transparent"
                style={{ animation: 'sb-scanline 2s linear infinite' }}
              />
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={handleInputChange}
          />

          {uploading ? (
            <div className="w-full max-w-sm animate-slide-up">
              {/* Stage indicator */}
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="relative">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-500/15 ring-1 ring-brand-400/20">
                    <Sparkles className="h-8 w-8 text-brand-300 animate-pulse" />
                  </div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="font-display text-lg font-semibold text-white">
                    {STAGES[stageIndex].label}
                  </p>
                  <p className="text-xs text-text-muted">{STAGES[stageIndex].detail}</p>
                </div>
              </div>

              {/* Progress bar with animated segments */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-text-muted mb-2">
                  <span>Progress</span>
                  <span className="font-mono tabular-nums text-brand-300">{Math.max(8, progress)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-border">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 via-cyan-400 to-brand-500 transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(8, progress)}%` }}
                  />
                </div>
              </div>

              {/* Stage progress indicators */}
              <div className="flex items-center justify-center gap-1">
                {STAGES.map((stage, i) => (
                  <div key={stage.label} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        i < stageIndex ? 'bg-emerald-400' : i === stageIndex ? 'bg-brand-400 animate-pulse' : 'bg-surface-border'
                      }`}
                    />
                    <span className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-[11px] text-text-muted">
                {progress < 100 ? `Uploading ${progress}%` : 'Processing on the server…'}
              </p>
            </div>
          ) : (
            <div className="animate-slide-up">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-500/12 text-brand-300 ring-1 ring-brand-400/20">
                <UploadCloud className="h-7 w-7" />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold text-white">
                Drop your resume here
              </h2>
              <p className="mt-2 max-w-sm mx-auto text-sm text-text-muted">
                PDF or DOCX, up to {MAX_UPLOAD_MB} MB. Your file is stored privately against
                your account and is never exposed publicly.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  icon={<FileText className="h-4 w-4" />}
                  onClick={() => inputRef.current?.click()}
                >
                  Choose file
                </Button>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={handleInputChange}
              />
            </div>
          )}

          {uploadError && (
            <InlineError message={uploadError} />
          )}
          {statusMessage && !uploadError && !uploading && (
            <p role="status" className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-300 animate-fade-in">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {statusMessage}
            </p>
          )}
        </div>
      </section>

      {/* Past uploads */}
      {resumes.length > 0 && (
        <section className="sb-glass rounded-2xl p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm font-semibold text-white">Your resumes</h2>
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted sb-badge-neutral">
              {resumes.length} file{resumes.length !== 1 ? 's' : ''}
            </span>
          </div>
          <ul className="space-y-2">
            {resumes.map((resume) => (
              <li
                key={resume.id}
                className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200 ${
                  analysis?.resume.id === resume.id
                    ? 'border-brand-400/30 bg-brand-500/8 sb-gradient-border'
                    : 'border-surface-border bg-surface-elevated/30'
                }`}
              >
                <FileText className="h-4 w-4 shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">{resume.filename}</p>
                  <p className="text-[11px] text-text-muted">
                    {formatBytes(resume.file_size_bytes)} · {resume.skill_count} skills ·{' '}
                    {new Date(resume.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[resume.analysis_status]}>
                  {resume.analysis_status}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void loadAnalysis(resume.id)}
                  disabled={resume.analysis_status !== 'completed'}
                >
                  View analysis
                </Button>
                <button
                  type="button"
                  onClick={() => void handleDelete(resume.id)}
                  aria-label={`Delete ${resume.filename}`}
                  className="grid h-7 w-7 place-items-center rounded-lg text-text-muted transition hover:bg-rose-500/10 hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Analysis result */}
      {analysisLoading && (
        <div className="animate-fade-in">
          <div className="sb-glass rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-brand-400" />
              <p className="font-display text-sm font-semibold text-white">Analysing your resume…</p>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400 animate-pulse"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>
      )}

      {analysisError && !analysisLoading && (
        <ErrorState message={analysisError} onRetry={() => analysis && void loadAnalysis(analysis.resume.id)} />
      )}

      {!analysisLoading && !analysisError && !analysis && resumes.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No resume uploaded"
          description="Upload your resume to discover opportunities aligned with your skills."
        />
      )}

      {analysis && !analysisLoading && (
        <div className="space-y-6 animate-fade-in">
          {analysis.warnings.length > 0 && (
            <div className="rounded-2xl border border-amber-400/25 bg-amber-500/8 p-4 animate-slide-up">
              <p className="flex items-center gap-2 text-xs font-medium text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                Parsing notes
              </p>
              <ul className="mt-2 space-y-1 text-[11px] text-amber-100/80">
                {analysis.warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          <section className="sb-glass rounded-2xl p-5 animate-slide-up">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-semibold text-white">
                  {analysis.detected_skills.length} skills identified
                </h2>
                <p className="mt-0.5 text-xs text-text-muted">
                  {analysis.word_count} words ·{' '}
                  {analysis.detected_name ? `${analysis.detected_name} · ` : ''}
                  {analysis.resume.filename}
                </p>
              </div>
              <Link to="/opportunities">
                <Button variant="secondary" size="sm">
                  Browse opportunities
                </Button>
              </Link>
            </div>

            {analysis.detected_skills.length === 0 ? (
              <p className="mt-4 rounded-xl border border-surface-border bg-surface-elevated/30 px-3 py-6 text-center text-xs text-text-muted">
                No recognisable skills were found. Try a resume with a dedicated skills
                section, or add skills manually on your profile.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {Object.entries(analysis.skills_by_category).map(([category, names]) => (
                  <div key={category} className="animate-slide-up">
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      {category}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {names.map((name) => {
                        const detail = analysis.detected_skills.find(
                          (skill) => skill.name === name,
                        )
                        return (
                          <SkillChip
                            key={name}
                            label={name}
                            state={detail?.saved ? 'matched' : 'neutral'}
                            detail={detail ? `${Math.round(detail.confidence * 100)}%` : undefined}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {analysis.sections_found.length > 0 && (
            <section className="sb-glass rounded-2xl p-5 animate-slide-up">
              <h2 className="font-display text-sm font-semibold text-white">Sections detected</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {Object.entries(analysis.section_previews).map(([section, lines]) => (
                  <div key={section}>
                    <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      {section}
                    </h3>
                    <ul className="space-y-1 text-[11px] leading-relaxed text-text-muted">
                      {lines.map((line, index) => (
                        <li key={index} className="truncate flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-brand-500/50 flex-shrink-0" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {analysis.top_opportunities.length > 0 && (
            <section className="animate-slide-up">
              <div className="flex items-end justify-between gap-3 mb-4">
                <h2 className="font-display text-sm font-semibold text-white">
                  Opportunities aligned with these skills
                </h2>
                <Link to="/opportunities" className="text-xs font-medium text-brand-300 hover:text-brand-200 flex items-center gap-1">
                  View all <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {analysis.top_opportunities.map((opportunity) => (
                  <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                ))}
              </div>
            </section>
          )}

          {/* Employers plus the open roles behind them */}
          <CompaniesMatchingSkills
            companyLimit={6}
            opportunityLimit={6}
            eyebrow="What to do with these skills"
          />
        </div>
      )}
    </div>
  )
}