import { Plus, Save, Trash2, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState, InlineError } from '../components/ui/ErrorState'
import { SelectField, TagInput, TextAreaField, TextField } from '../components/ui/Field'
import { SkeletonCard } from '../components/ui/LoadingSkeleton'
import { PageHeader } from '../components/ui/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { getApiErrorMessage } from '../services/api'
import {
  addStudentSkill,
  fetchProfile,
  fetchSkillCatalogue,
  fetchStudentSkills,
  removeStudentSkill,
  updateStudentSkill,
  updateProfile,
} from '../services/profile'
import type { Proficiency, StudentSkill } from '../types'
import { useAuth } from '../store/authContext'

const PROFICIENCY_OPTIONS: { value: Proficiency; label: string }[] = [
  { value: 'unknown', label: 'Not rated' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

const ROLE_SUGGESTIONS = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Analyst',
  'Data Scientist',
  'Machine Learning Engineer',
  'DevOps Engineer',
]

function groupByCategory(skills: StudentSkill[]): [string, StudentSkill[]][] {
  const groups = new Map<string, StudentSkill[]>()
  for (const skill of skills) {
    const bucket = groups.get(skill.category) ?? []
    bucket.push(skill)
    groups.set(skill.category, bucket)
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

export default function Profile() {
  const { refresh } = useAuth()

  const profileState = useAsync(fetchProfile, [])
  const skillsState = useAsync(fetchStudentSkills, [])
  const catalogueState = useAsync(() => fetchSkillCatalogue(), [])

  // Editable copy of the profile, seeded once the request resolves.
  const [form, setForm] = useState<Record<string, string>>({})
  const [roles, setRoles] = useState<string[] | null>(null)
  const [locations, setLocations] = useState<string[] | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [newSkill, setNewSkill] = useState('')
  const [skillBusy, setSkillBusy] = useState<number | 'add' | null>(null)
  const [skillError, setSkillError] = useState<string | null>(null)

  const profile = profileState.data
  const studentSkills = skillsState.data ?? []

  // Merge the fetched profile into the editable state exactly once per load.
  const valueOf = (key: string, fallback: string | number | null | undefined) =>
    form[key] ?? (fallback === null || fallback === undefined ? '' : String(fallback))

  const effectiveRoles = roles ?? profile?.preferred_roles ?? []
  const effectiveLocations = locations ?? profile?.preferred_locations ?? []

  const grouped = useMemo(() => groupByCategory(studentSkills), [studentSkills])

  const saveProfile = async () => {
    if (!profile) return
    setSavingProfile(true)
    setProfileError(null)
    setProfileMessage(null)

    const asText = (key: string, fallback: string | null) => {
      const raw = form[key] ?? fallback ?? ''
      return raw.trim() ? raw.trim() : null
    }

    try {
      const yearRaw = form.graduation_year ?? String(profile.graduation_year ?? '')
      await updateProfile({
        full_name: asText('full_name', profile.full_name),
        college: asText('college', profile.college),
        degree: asText('degree', profile.degree),
        branch: asText('branch', profile.branch),
        graduation_year: yearRaw ? Number(yearRaw) : null,
        preferred_roles: effectiveRoles,
        preferred_locations: effectiveLocations,
        work_type: (form.work_type ?? profile.work_type) || null,
        bio: asText('bio', profile.bio),
      })
      setProfileMessage('Profile saved.')
      await refresh()
      profileState.reload()
    } catch (caught) {
      setProfileError(getApiErrorMessage(caught))
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAddSkill = async () => {
    const name = newSkill.trim()
    if (!name) return
    setSkillBusy('add')
    setSkillError(null)
    try {
      await addStudentSkill({ skill_name: name })
      setNewSkill('')
      skillsState.reload()
    } catch (caught) {
      setSkillError(getApiErrorMessage(caught))
    } finally {
      setSkillBusy(null)
    }
  }

  const handleProficiency = async (skill: StudentSkill, proficiency: string) => {
    setSkillBusy(skill.id)
    setSkillError(null)
    try {
      await updateStudentSkill(skill.id, proficiency)
      skillsState.reload()
    } catch (caught) {
      setSkillError(getApiErrorMessage(caught))
    } finally {
      setSkillBusy(null)
    }
  }

  const handleRemoveSkill = async (skill: StudentSkill) => {
    setSkillBusy(skill.id)
    setSkillError(null)
    try {
      await removeStudentSkill(skill.id)
      skillsState.reload()
    } catch (caught) {
      setSkillError(getApiErrorMessage(caught))
    } finally {
      setSkillBusy(null)
    }
  }

  if (profileState.loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={6} />
        <SkeletonCard lines={4} />
      </div>
    )
  }

  if (profileState.error || !profile) {
    return (
      <ErrorState
        message={profileState.error ?? 'Your profile could not be loaded.'}
        onRetry={profileState.reload}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Keep your details current so your matches stay relevant."
        actions={
          <Button
            loading={savingProfile}
            icon={<Save className="h-4 w-4" />}
            onClick={() => void saveProfile()}
          >
            Save changes
          </Button>
        }
      />

      {profileError && <InlineError message={profileError} />}
      {profileMessage && (
        <p role="status" className="text-xs text-emerald-300">
          {profileMessage}
        </p>
      )}

      <section className="sb-glass space-y-5 rounded-2xl p-5 sm:p-6">
        <h2 className="font-display text-sm font-semibold text-white">Your details</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="full_name"
            label="Full name"
            value={valueOf('full_name', profile.full_name)}
            onChange={(event) => setForm({ ...form, full_name: event.target.value })}
          />
          <TextField
            id="college"
            label="College"
            value={valueOf('college', profile.college)}
            onChange={(event) => setForm({ ...form, college: event.target.value })}
          />
          <TextField
            id="degree"
            label="Degree"
            value={valueOf('degree', profile.degree)}
            onChange={(event) => setForm({ ...form, degree: event.target.value })}
          />
          <TextField
            id="branch"
            label="Branch"
            value={valueOf('branch', profile.branch)}
            onChange={(event) => setForm({ ...form, branch: event.target.value })}
          />
          <TextField
            id="graduation_year"
            label="Graduation year"
            type="number"
            value={valueOf('graduation_year', profile.graduation_year)}
            onChange={(event) => setForm({ ...form, graduation_year: event.target.value })}
          />
          <SelectField
            id="work_type"
            label="Preferred work type"
            value={valueOf('work_type', profile.work_type)}
            onChange={(event) => setForm({ ...form, work_type: event.target.value })}
            placeholder="No preference"
            options={[
              { value: 'remote', label: 'Remote' },
              { value: 'hybrid', label: 'Hybrid' },
              { value: 'onsite', label: 'On-site' },
            ]}
          />
        </div>

        <TagInput
          id="roles"
          label="Preferred roles"
          values={effectiveRoles}
          onChange={setRoles}
          suggestions={ROLE_SUGGESTIONS}
        />

        <TagInput
          id="locations"
          label="Preferred locations"
          values={effectiveLocations}
          onChange={setLocations}
          suggestions={['Bengaluru', 'Hyderabad', 'Pune', 'Mumbai', 'Chennai', 'Remote']}
        />

        <TextAreaField
          id="bio"
          label="Bio"
          value={valueOf('bio', profile.bio)}
          onChange={(event) => setForm({ ...form, bio: event.target.value })}
        />
      </section>

      <section className="sb-glass space-y-4 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-semibold text-white">Your skills</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Extracted from your resume. Correct anything the extractor got wrong.
            </p>
          </div>
          <Badge tone="brand">{studentSkills.length} skills</Badge>
        </div>

        {skillError && <InlineError message={skillError} />}

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            list="skill-catalogue"
            value={newSkill}
            onChange={(event) => setNewSkill(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void handleAddSkill()
              }
            }}
            placeholder="Add a skill, e.g. Docker"
            aria-label="Add a skill"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-brand-400/40 focus:outline-none"
          />
          <datalist id="skill-catalogue">
            {(catalogueState.data ?? []).map((item) => (
              <option key={item.id} value={item.name} />
            ))}
          </datalist>
          <Button
            icon={<Plus className="h-4 w-4" />}
            loading={skillBusy === 'add'}
            onClick={() => void handleAddSkill()}
          >
            Add skill
          </Button>
        </div>

        {skillsState.loading ? (
          <SkeletonCard lines={3} />
        ) : studentSkills.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title="No skills yet"
            description="Upload a resume and we will extract your skills automatically, or add them above."
          />
        ) : (
          <div className="space-y-5">
            {grouped.map(([category, skills]) => (
              <div key={category}>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {category}
                </h3>
                <ul className="space-y-2">
                  {skills.map((skill) => (
                    <li
                      key={skill.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                        {skill.name}
                      </span>

                      <span className="text-[11px] text-slate-500" title="Extraction confidence">
                        {Math.round(skill.confidence * 100)}% · {skill.source}
                      </span>

                      <select
                        aria-label={`Proficiency for ${skill.name}`}
                        value={skill.proficiency}
                        disabled={skillBusy === skill.id}
                        onChange={(event) => void handleProficiency(skill, event.target.value)}
                        className="rounded-lg border border-white/10 bg-ink-850 px-2.5 py-1.5 text-[11px] text-slate-300 focus:border-brand-400/40 focus:outline-none"
                      >
                        {PROFICIENCY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => void handleRemoveSkill(skill)}
                        disabled={skillBusy === skill.id}
                        aria-label={`Remove ${skill.name}`}
                        className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
