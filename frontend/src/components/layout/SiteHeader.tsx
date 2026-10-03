import { Link } from 'react-router-dom'

import { useAuth } from '../../store/authContext'
import { SkillBridgeLogo } from '../ui/SkillBridgeLogo'
import { Button } from '../ui/Button'
import { BackendStatus } from './BackendStatus'

export function SiteHeader() {
  const { status } = useAuth()

  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link to="/" className="flex items-center gap-2.5">
          <SkillBridgeLogo size={28} />
          <span className="font-display text-sm font-semibold tracking-tight text-white">
            SkillBridge <span className="text-brand-300">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden sm:block">
            <BackendStatus />
          </span>

          {status === 'authenticated' ? (
            <Link to="/dashboard">
              <Button size="sm">Open dashboard</Button>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-xs font-medium text-slate-300 transition hover:text-white"
              >
                Sign in
              </Link>
              <Link to="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
