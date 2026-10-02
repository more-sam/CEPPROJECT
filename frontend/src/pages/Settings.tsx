import { KeyRound, ShieldAlert, Trash2, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { BackendStatus } from '../components/layout/BackendStatus'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { InlineError } from '../components/ui/ErrorState'
import { TextField } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { getApiErrorMessage } from '../services/api'
import { changePassword, deleteAccount } from '../services/auth'
import { deleteResume, formatBytes, listResumes } from '../services/resume'
import { useAuth } from '../store/authContext'

export default function Settings() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const resumes = useAsync(listResumes, [])

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [resumeError, setResumeError] = useState<string | null>(null)

  const handlePasswordChange = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordError(null)
    setPasswordMessage(null)

    if (newPassword !== confirmPassword) {
      setPasswordError('Those new passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Your new password must be at least 8 characters.')
      return
    }

    setSavingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      setPasswordMessage('Password updated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (caught) {
      setPasswordError(getApiErrorMessage(caught))
    } finally {
      setSavingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteAccount(deletePassword)
      await signOut()
      navigate('/', { replace: true })
    } catch (caught) {
      setDeleteError(getApiErrorMessage(caught))
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteResume = async (resumeId: number) => {
    setResumeError(null)
    try {
      await deleteResume(resumeId)
      resumes.reload()
    } catch (caught) {
      setResumeError(getApiErrorMessage(caught))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Account, security, privacy and data." />

      {/* Account */}
      <section className="sb-glass rounded-2xl p-5 sm:p-6">
        <h2 className="inline-flex items-center gap-2 font-display text-sm font-semibold text-white">
          <UserRound className="h-4 w-4 text-brand-300" />
          Account
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-slate-500">Email</dt>
            <dd className="mt-1 text-sm text-slate-200">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-slate-500">
              Member since
            </dt>
            <dd className="mt-1 text-sm text-slate-200">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link to="/profile">
            <Button variant="secondary" size="sm">
              Edit profile and skills
            </Button>
          </Link>
          <BackendStatus />
        </div>
      </section>

      {/* Security */}
      <section className="sb-glass rounded-2xl p-5 sm:p-6">
        <h2 className="inline-flex items-center gap-2 font-display text-sm font-semibold text-white">
          <KeyRound className="h-4 w-4 text-brand-300" />
          Security
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Passwords are hashed with bcrypt. We never store or log them in plain text.
        </p>

        <form onSubmit={(event) => void handlePasswordChange(event)} className="mt-4 space-y-4" noValidate>
          {passwordError && <InlineError message={passwordError} />}
          {passwordMessage && (
            <p role="status" className="text-xs text-emerald-300">
              {passwordMessage}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              id="current_password"
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            <TextField
              id="new_password"
              label="New password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <TextField
              id="confirm_password"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          <Button type="submit" loading={savingPassword}>
            Update password
          </Button>
        </form>
      </section>

      {/* Data management */}
      <section className="sb-glass rounded-2xl p-5 sm:p-6">
        <h2 className="inline-flex items-center gap-2 font-display text-sm font-semibold text-white">
          <ShieldAlert className="h-4 w-4 text-amber-300" />
          Privacy and data
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Your resume text is stored privately against your account and is never exposed to
          other students or returned in public endpoints.
        </p>

        {resumeError && (
          <div className="mt-3">
            <InlineError message={resumeError} />
          </div>
        )}

        <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Uploaded resumes
        </h3>

        {resumes.loading ? (
          <p className="mt-2 text-xs text-slate-500">Loading…</p>
        ) : (resumes.data ?? []).length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">You have not uploaded a resume yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(resumes.data ?? []).map((resume) => (
              <li
                key={resume.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-200">{resume.filename}</p>
                  <p className="text-[11px] text-slate-500">
                    {formatBytes(resume.file_size_bytes)} ·{' '}
                    {new Date(resume.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge tone={resume.analysis_status === 'completed' ? 'success' : 'warn'}>
                  {resume.analysis_status}
                </Badge>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={() => void handleDeleteResume(resume.id)}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 rounded-xl border border-rose-500/25 bg-rose-500/8 p-4">
          <h3 className="text-xs font-semibold text-rose-200">Delete your account</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-rose-100/70">
            This permanently removes your account, profile, skills, resumes, roadmaps,
            assessments and saved opportunities. This cannot be undone.
          </p>
          <Button
            variant="danger"
            size="sm"
            className="mt-3"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={() => setDeleteOpen(true)}
          >
            Delete account
          </Button>
        </div>
      </section>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete your account?"
        description="Enter your password to confirm. Everything will be permanently removed."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              disabled={!deletePassword}
              onClick={() => void handleDeleteAccount()}
            >
              Permanently delete
            </Button>
          </>
        }
      >
        {deleteError && (
          <div className="mb-3">
            <InlineError message={deleteError} />
          </div>
        )}
        <TextField
          id="delete_password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={deletePassword}
          onChange={(event) => setDeletePassword(event.target.value)}
        />
      </Modal>
    </div>
  )
}
