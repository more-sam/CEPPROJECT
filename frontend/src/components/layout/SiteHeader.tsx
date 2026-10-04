import { Link } from 'react-router-dom'

import { useAuth } from '../../store/authContext'
import { SkillBridgeLogo } from '../ui/SkillBridgeLogo'
import { Button } from '../ui/Button'
import { BackendStatus } from './BackendStatus'

export function SiteHeader() {
  const { status } = useAuth()

  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1550px] items-center justify-between gap-4 px-[5vw] py-3">
        <Link to="/" className="flex items-center gap-2.5" aria-label="SkillBridge AI home">
                <SkillBridgeLogo size={28} variant="full" animated={false} />
        </Link>

        <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
          <Link to="/opportunities" className="text-xs font-medium text-slate-400 hover:text-white transition-colors">
            Opportunities
          </Link>
          <Link to="/dashboard" className="text-xs font-medium text-slate-400 hover:text-white transition-colors">
            Dashboard
          </Link>
          <Link to="/assistant" className="text-xs font-medium text-slate-400 hover:text-white transition-colors">
            AI Assistant
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden sm:block">
            <BackendStatus />
          </span>

          {status === 'authenticated' ? (
            <Link to="/dashboard">
              <Button size="sm" variant="secondary">Open dashboard</Button>
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
