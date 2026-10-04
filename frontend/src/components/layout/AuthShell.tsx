import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { SkillBridgeLogo } from '../ui/SkillBridgeLogo'
import { AiOrb } from '../ui/AiOrb'

interface AuthShellProps {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

/** Shared frame for the sign-in and sign-up screens. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand side - decorative, hidden from assistive tech. */}
      <aside
        className="relative hidden flex-col justify-between border-r border-white/8 p-10 lg:flex bg-ink-950/50"
        aria-hidden="true"
      >
        <Link to="/" className="flex items-center gap-2" aria-label="SkillBridge AI home">
          <SkillBridgeLogo size={30} variant="full" animated={false} />
        </Link>

        <div className="flex flex-col items-center gap-6">
          <div className="sb-float">
            <AiOrb size={220} />
          </div>
          <div className="text-center">
            <p className="font-display text-lg font-medium leading-snug text-white">
              Find where your skills belong.
            </p>
            <p className="mt-2 max-w-sm text-center text-xs leading-relaxed text-slate-500">
              AI-powered career intelligence that analyses your skills, discovers
              relevant opportunities, and shows you what to learn next.
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
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>

          <div className="mt-7 space-y-4">{children}</div>

          <div className="mt-6 text-sm text-slate-400">{footer}</div>
        </div>
      </main>
    </div>
  )
}