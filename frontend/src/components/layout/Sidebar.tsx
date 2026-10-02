import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'

import { useAuth } from '../../store/authContext'
import { SkillBridgeLogo } from '../ui/SkillBridgeLogo'
import { NAV_ITEMS } from './navigation'

function initials(name: string | null | undefined, fallback: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
  }
  return fallback.slice(0, 1).toUpperCase()
}

interface SidebarProps {
  /** Called after any navigation, so the mobile drawer can close itself. */
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { user, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    // No manual navigation here: clearing the session makes ProtectedRoute send
    // the now-anonymous visitor to /login. Racing a navigate() against that
    // guard made the destination depend on render order.
    await signOut()
    setSigningOut(false)
  }

  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <NavLink to="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
        <SkillBridgeLogo size={32} />
        <span className="font-display text-sm font-semibold tracking-tight text-white">
          SkillBridge <span className="text-brand-300">AI</span>
        </span>
      </NavLink>

      <nav aria-label="Main" className="flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand-500/15 text-white ring-1 ring-brand-400/25'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-white/8 pt-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-200 ring-1 ring-brand-400/25">
            {initials(null, user?.email ?? '?')}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-200">
              {user?.email ?? 'Signed out'}
            </p>
            <p className="text-[11px] text-slate-500">Student account</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          className="mt-3 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}
