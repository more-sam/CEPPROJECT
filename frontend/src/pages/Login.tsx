import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { SkillBridgeLogo } from '../components/ui/SkillBridgeLogo'
import { AiOrb } from '../components/ui/AiOrb'
import { Button } from '../components/ui/Button'
import { InlineError } from '../components/ui/ErrorState'
import { TextField } from '../components/ui/Field'
import { getApiErrorMessage } from '../services/api'
import { useAuth } from '../store/authContext'

interface LocationState {
  from?: string
}

export default function Login() {
  const { status, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // While a sign-in is completing, this page owns the navigation so a student
  // deep-linked from a protected route is returned there rather than to the
  // dashboard. The ref must be readable during the render that follows the auth
  // state flipping, which is why it is not state.
  const signingInRef = useRef(false)

  // Already signed in? Skip the form entirely.
  if (status === 'authenticated' && !signingInRef.current) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    signingInRef.current = true
    try {
      await signIn(email.trim(), password)
      const from = (location.state as LocationState | null)?.from
      navigate(from && from !== '/login' ? from : '/dashboard', { replace: true })
    } catch (caught) {
      // Failed sign-in means we are still anonymous, so let the guard work again.
      signingInRef.current = false
      setError(getApiErrorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand side - decorative, hidden from assistive tech. */}
      <aside
        className="relative hidden flex-col justify-between border-r border-white/8 p-10 lg:flex bg-ink-950/50"
        aria-hidden="true"
      >
        <Link to="/" className="flex items-center gap-2" aria-label="SkillBridge AI home">
          <SkillBridgeLogo size={24} />
        </Link>

        <div className="flex flex-col items-center gap-6">
          <div className="sb-float">
            <AiOrb size={220} />
          </div>
          <div className="text-center">
            <p className="font-display text-lg font-medium leading-snug text-white">
              Welcome back.
            </p>
            <p className="mt-2 max-w-sm text-center text-xs leading-relaxed text-slate-500">
              Continue your career journey. Your skills, roadmap and progress are
              waiting for you.
            </p>
          </div>

          <p className="text-xs text-slate-600">
            SkillBridge Compatibility is a skill-alignment indicator, not a hiring
            prediction.
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 font-display text-sm font-semibold text-white lg:hidden"
            aria-label="SkillBridge AI home"
          >
            <SkillBridgeLogo size={22} />
          </Link>

          <h1 className="font-display text-2xl font-semibold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">Sign in to continue where you left off.</p>

          <div className="mt-7 space-y-4">
            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4" noValidate>
              {error && <InlineError message={error} />}

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
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />

              <Button type="submit" fullWidth loading={submitting}>
                Sign in
              </Button>
            </form>

            <div className="rounded-xl border border-white/8 bg-white/4 p-3 text-[11px] leading-relaxed text-slate-500">
              <p className="font-medium text-slate-400">Demo account</p>
              <p>
                demo@skillbridge.dev · DemoPassword123!
                <br />
                Development-only credentials, never valid in production.
              </p>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-slate-400">
            New to SkillBridge?{' '}
            <Link to="/register" className="font-medium text-brand-300 hover:text-brand-200">
              Create an account
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}