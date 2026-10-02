import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { AuthShell } from '../components/layout/AuthShell'
import { Button } from '../components/ui/Button'
import { InlineError } from '../components/ui/ErrorState'
import { TextField } from '../components/ui/Field'
import { getApiErrorMessage } from '../services/api'
import { useAuth } from '../store/authContext'

const MIN_PASSWORD_LENGTH = 8
/** bcrypt ignores bytes past 72, so the backend rejects longer passwords. */
const MAX_PASSWORD_LENGTH = 72

export default function Register() {
  const { status, signUp } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Once sign-up succeeds we are authenticated, which would otherwise trip the
  // guard below and send the new student to /dashboard, skipping onboarding.
  // A ref (not state) is required: it must be readable during the very render
  // that follows the auth state flipping.
  const signingUpRef = useRef(false)

  if (status === 'authenticated' && !signingUpRef.current) {
    return <Navigate to="/dashboard" replace />
  }

  const validate = (): string | null => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Enter a valid email address.'
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    }
    if (new Blob([password]).size > MAX_PASSWORD_LENGTH) {
      return `Password must not exceed ${MAX_PASSWORD_LENGTH} bytes.`
    }
    if (password !== confirm) {
      return 'Those passwords do not match.'
    }
    return null
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)
    signingUpRef.current = true
    try {
      await signUp(email.trim(), password, fullName.trim())
      // A brand-new account has no profile details yet, so send them straight
      // into onboarding rather than the dashboard.
      navigate('/onboarding', { replace: true })
    } catch (caught) {
      // Failed sign-up means we are still anonymous, so let the guard work again.
      signingUpRef.current = false
      setError(getApiErrorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start by telling us about your studies. It takes a minute."
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="font-medium text-brand-300 hover:text-brand-200">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4" noValidate>
        {error && <InlineError message={error} />}

        <TextField
          id="full_name"
          label="Full name"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Alex Sharma"
        />

        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@college.edu"
        />

        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
        />

        <TextField
          id="confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Repeat your password"
        />

        <Button type="submit" fullWidth loading={submitting}>
          Create account
        </Button>
      </form>

      <p className="text-[11px] leading-relaxed text-slate-500">
        Your resume and profile data are stored privately against your account and are
        never publicly accessible.
      </p>
    </AuthShell>
  )
}
