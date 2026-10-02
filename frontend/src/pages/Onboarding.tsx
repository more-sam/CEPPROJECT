import { useState, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../components/ui/Button'
import { InlineError } from '../components/ui/ErrorState'
import { SelectField, TagInput, TextAreaField, TextField } from '../components/ui/Field'
import { AiOrb } from '../components/ui/AiOrb'
import { GlassPanel } from '../components/ui/GlassPanel'
import { getApiErrorMessage } from '../services/api'
import { updateProfile } from '../services/profile'
import { useAuth } from '../store/authContext'

const ROLE_SUGGESTIONS = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Analyst',
  'Data Scientist',
  'Machine Learning Engineer',
  'DevOps Engineer',
  'QA Engineer',
]

const LOCATION_SUGGESTIONS = [
  'Bengaluru',
  'Hyderabad',
  'Pune',
  'Mumbai',
  'Chennai',
  'Remote',
]

const CURRENT_YEAR = new Date().getFullYear()

export default function Onboarding() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [college, setCollege] = useState('')
  const [degree, setDegree] = useState('')
  const [branch, setBranch] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [workType, setWorkType] = useState('')
  const [bio, setBio] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const save = async () => {
    setSubmitting(true)
    setError(null)

    try {
      await updateProfile({
        full_name: fullName.trim() || null,
        college: college.trim() || null,
        degree: degree.trim() || null,
        branch: branch.trim() || null,
        graduation_year: graduationYear ? Number(graduationYear) : null,
        preferred_roles: roles,
        preferred_locations: locations,
        work_type: workType || null,
        bio: bio.trim() || null,
      })
      // Refresh the session so `hasProfile` reflects what we just saved.
      await refresh()
      navigate('/resume', { replace: true })
    } catch (caught) {
      setError(getApiErrorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void save()
  }

  const handleSkip = () => {
    // Move straight on without saving anything yet.
    navigate('/resume', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-5 py-10">
      <div className="mb-8 flex items-center gap-4">
        <AiOrb size={72} />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-brand-300">
            Step 1 of 3
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white">
            Welcome, {user?.email.split('@')[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Tell us about your studies so your matches and roadmap are relevant.
          </p>
        </div>
      </div>

      <GlassPanel className="p-6 sm:p-8">
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5" noValidate>
          {error && <InlineError message={error} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="full_name"
              label="Full name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Alex Sharma"
            />
            <TextField
              id="college"
              label="College"
              value={college}
              onChange={(event) => setCollege(event.target.value)}
              placeholder="Govt College of Engineering"
            />
            <TextField
              id="degree"
              label="Degree"
              value={degree}
              onChange={(event) => setDegree(event.target.value)}
              placeholder="B.Tech"
            />
            <TextField
              id="branch"
              label="Branch"
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              placeholder="Computer Science"
            />
            <TextField
              id="graduation_year"
              label="Graduation year"
              type="number"
              min={1950}
              max={2100}
              value={graduationYear}
              onChange={(event) => setGraduationYear(event.target.value)}
              placeholder={String(CURRENT_YEAR + 1)}
            />
            <SelectField
              id="work_type"
              label="Preferred work type"
              value={workType}
              onChange={(event) => setWorkType(event.target.value)}
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
            values={roles}
            onChange={setRoles}
            suggestions={ROLE_SUGGESTIONS}
            placeholder="e.g. Frontend Developer"
          />

          <TagInput
            id="locations"
            label="Preferred locations"
            values={locations}
            onChange={setLocations}
            suggestions={LOCATION_SUGGESTIONS}
            placeholder="e.g. Bengaluru"
          />

          <TextAreaField
            id="bio"
            label="Short bio (optional)"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="What are you interested in building?"
          />

          <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-5">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Skip for now
            </button>
            <Button type="submit" loading={submitting} icon={<ArrowRight className="h-4 w-4" />}>
              Continue to resume
            </Button>
          </div>
        </form>
      </GlassPanel>
    </div>
  )
}
