import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { OpportunityCard } from '../components/opportunities/OpportunityCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState, InlineError } from '../components/ui/ErrorState'
import { SkeletonCard } from '../components/ui/LoadingSkeleton'
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

/** Staged copy shown while the backend works (spec §31). */
const STAGES = [
  'Reading resume…',
  'Extracting skills…',
  'Understanding experience…',
  'Building skill profile…',
  'Finding opportunities…',
]

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
    // Allow re-selecting the same file afterwards.
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
    <div className="space-y-6">
      <PageHeader
        title="Resume analysis"
        subtitle="Upload a PDF or DOCX. We extract your skills and match them against real opportunities."
      />

      {/* Upload zone */}
      <section>
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`sb-glass flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
            dragging ? 'border-brand-400/60 bg-brand-500/5' : 'border-white/10'
          }`}
        >
          {uploading ? (
            <div className="w-full max-w-sm">
              <div className="flex items-center justify-center gap-3">
                <Sparkles className="h-5 w-5 animate-pulse text-brand-300" />
                <p className="font-display text-sm font-semibold text-white">
                  {STAGES[stageIndex]}
                </p>
              </div>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-aqua-400 transition-all"
                  style={{ width: `${Math.max(8, progress)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                {progress < 100 ? `Uploading ${progress}%` : 'Processing on the server…'}
              </p>
            </div>
          ) : (
            <>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/12 text-brand-300 ring-1 ring-brand-400/20">
                <UploadCloud className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-display text-base font-semibold text-white">
                Drop your resume here
              </h2>
              <p className="mt-1.5 max-w-sm text-sm text-slate-400">
                PDF or DOCX, up to {MAX_UPLOAD_MB} MB. Your file is stored privately against
                your account and is never exposed publicly.
              </p>
              <div className="mt-5">
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
            </>
          )}
        </div>

        {uploadError && (
          <div className="mt-3">
            <InlineError message={uploadError} />
          </div>
        )}
        {statusMessage && !uploadError && (
          <p role="status" className="mt-3 flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {statusMessage}
          </p>
        )}
      </section>

      {/* Past uploads */}
      {resumes.length > 0 && (
        <section className="sb-glass rounded-2xl p-5">
          <h2 className="mb-3 font-display text-sm font-semibold text-white">
            Your resumes
          </h2>
          <ul className="space-y-2">
            {resumes.map((resume) => (
              <li
                key={resume.id}
                className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                  analysis?.resume.id === resume.id
                    ? 'border-brand-400/30 bg-brand-500/8'
                    : 'border-white/8 bg-white/4'
                }`}
              >
                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-200">
                    {resume.filename}
                  </p>
                  <p className="text-[11px] text-slate-500">
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
                  className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Analysis result */}
      {analysisLoading && <SkeletonCard lines={6} />}

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
        <div className="space-y-5">
          {analysis.warnings.length > 0 && (
            <div className="rounded-2xl border border-amber-400/25 bg-amber-500/8 p-4">
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

          <section className="sb-glass rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-semibold text-white">
                  {analysis.detected_skills.length} skills identified
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
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
              <p className="mt-4 rounded-xl border border-white/8 bg-white/4 px-3 py-6 text-center text-xs text-slate-500">
                No recognisable skills were found. Try a resume with a dedicated skills
                section, or add skills manually on your profile.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {Object.entries(analysis.skills_by_category).map(([category, names]) => (
                  <div key={category}>
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
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
                            detail={
                              detail ? `${Math.round(detail.confidence * 100)}%` : undefined
                            }
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
            <section className="sb-glass rounded-2xl p-5">
              <h2 className="font-display text-sm font-semibold text-white">
                Sections detected
              </h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {Object.entries(analysis.section_previews).map(([section, lines]) => (
                  <div key={section}>
                    <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {section}
                    </h3>
                    <ul className="space-y-1 text-[11px] leading-relaxed text-slate-400">
                      {lines.map((line, index) => (
                        <li key={index} className="truncate">
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
            <section>
              <h2 className="mb-4 font-display text-sm font-semibold text-white">
                Opportunities aligned with these skills
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {analysis.top_opportunities.map((opportunity) => (
                  <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
