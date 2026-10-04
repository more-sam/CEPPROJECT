import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Building2, Briefcase, Target, TrendingUp, Upload, Sparkles, Compass, Zap, GitBranch } from 'lucide-react'

import { SkillBridgeLogo } from '../components/ui/SkillBridgeLogo'
import { fetchPlatformStats, type PlatformStats } from '../services/health'

interface HeroSkillNode {
  name: string
  x: number
  y: number
  category: string
  state: 'owned' | 'learning' | 'gap'
}

const FEATURES = [
  {
    icon: Upload,
    title: 'Resume Intelligence',
    body: 'Upload a PDF or DOCX. We extract your skills, projects and education into a structured profile.',
  },
  {
    icon: Target,
    title: 'Skill Alignment',
    body: 'See exactly which required skills you already have, and which ones are still missing.',
  },
  {
    icon: GitBranch,
    title: 'Learning Roadmap',
    body: 'Get an ordered, prerequisite-aware path covering only the gaps that matter.',
  },
  {
    icon: TrendingUp,
    title: 'Progress Tracking',
    body: 'Assessments and roadmap updates roll up into one clear view of your growth.',
  },
] as const

const PATHWAY = [
  { icon: Upload, label: 'Resume' },
  { icon: Sparkles, label: 'Skill Profile' },
  { icon: Target, label: 'Alignment' },
  { icon: Compass, label: 'Roadmap' },
  { icon: Briefcase, label: 'Opportunities' },
] as const

function StatsBand() {
  const [stats, setStats] = useState<PlatformStats | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchPlatformStats()
      .then((data) => {
        if (!cancelled && data.status === 'ok') setStats(data)
      })
      .catch(() => {
        /* stats are decorative */
      })
    return () => { cancelled = true }
  }, [])

  if (!stats) return null

  const items = [
    { icon: GitBranch, value: stats.skills ?? 0, label: 'Skills mapped' },
    { icon: Target, value: stats.jobs ?? 0, label: 'Live opportunities' },
    { icon: Building2, value: stats.companies ?? 0, label: 'Hiring companies' },
    { icon: Briefcase, value: stats.assessments ?? 0, label: 'Skill assessments' },
  ]

  return (
    <section className="pb-16" aria-label="Platform statistics">
      <div className="sb-glass rounded-2xl p-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/20">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="font-display text-xl font-semibold tabular-nums text-white sm:text-2xl">
                {value.toLocaleString()}
              </p>
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function HeroSkillNetwork() {
  const skills: HeroSkillNode[] = [
    { name: 'Python', x: 15, y: 45, category: 'backend', state: 'owned' },
    { name: 'React', x: 85, y: 25, category: 'frontend', state: 'owned' },
    { name: 'SQL', x: 35, y: 75, category: 'data', state: 'owned' },
    { name: 'Git', x: 65, y: 15, category: 'tools', state: 'owned' },
    { name: 'Docker', x: 90, y: 60, category: 'infra', state: 'learning' },
    { name: 'AWS', x: 10, y: 60, category: 'infra', state: 'learning' },
    { name: 'TypeScript', x: 55, y: 40, category: 'frontend', state: 'owned' },
    { name: 'Machine Learning', x: 30, y: 30, category: 'ai', state: 'gap' },
    { name: 'REST APIs', x: 75, y: 55, category: 'backend', state: 'owned' },
    { name: 'PostgreSQL', x: 45, y: 85, category: 'data', state: 'gap' },
  ]

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="skill-line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Connections to center (AI hub) */}
      {skills.map((skill) => (
        <line
          key={skill.name}
          x1={skill.x}
          y1={skill.y}
          x2={50}
          y2={50}
          stroke="url(#skill-line-gradient)"
          strokeWidth="0.5"
          strokeLinecap="round"
          opacity="0.4"
          filter="url(#glow)"
        />
      ))}
      {/* Skill nodes */}
      {skills.map((skill, i) => (
        <g key={skill.name} className="animate-slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
          <circle
            cx={skill.x}
            cy={skill.y}
            r="3.5"
            fill="url(#skill-line-gradient)"
            opacity="0.9"
            filter="url(#glow)"
          />
          <text
            x={skill.x}
            y={skill.y - 8}
            textAnchor="middle"
            fontSize="5"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontWeight="500"
            fill="#94a3b8"
            opacity="0.7"
          >
            {skill.name}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function Landing() {
  return (
    <div className="relative min-h-screen">
      {/* Background atmospheric layer */}
      <div className="fixed inset-0 bg-mesh pointer-events-none -z-10" aria-hidden="true" />

      <main className="mx-auto max-w-7xl px-5">
        {/* ---------------- Hero ---------------- */}
        <section className="relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="animate-slide-up" style={{ animationDelay: '0ms' }}>
            <p className="text-xs font-medium uppercase tracking-wider text-cyan-400/80 flex items-center gap-2 mt-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
              AI Career Intelligence Platform
            </p>

            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              <span className="sb-gradient-text">
                Bridge the gap between your skills and real opportunities.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
              Upload your resume to understand your skills, discover internships that
              align with them, and follow a personalised roadmap for the gaps that
              stand between you and your next role.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:from-brand-400 hover:to-brand-500 sb-lift"
              >
                Analyze my resume
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/opportunities"
                className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-elevated/50 px-5 py-3 text-sm font-semibold text-text-primary transition hover:bg-surface-elevated hover:border-brand-500/50 sb-lift"
              >
                <Zap className="h-4 w-4" />
                Explore opportunities
              </Link>
            </div>

            <p className="mt-4 text-xs text-text-muted">
              Free to use. Upload a PDF or DOCX resume and see your skills mapped to real
              openings in under a minute.
            </p>
          </div>

          <div className="relative grid place-items-center">
            <div className="relative animate-float">
              <div className="relative" style={{ width: '400px', height: '400px' }}>
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-500/20 via-violet-500/10 to-cyan-500/20 blur-[80px]" />
                <div className="absolute inset-0 rounded-full border border-brand-500/20 bg-gradient-to-br from-brand-500/5 to-transparent" />
                <HeroSkillNetwork />
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Live platform stats ---------------- */}
        <StatsBand />

        {/* ---------------- Compatibility example ---------------- */}
        <section className="grid gap-6 pb-16 lg:grid-cols-2 lg:items-center">
          <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              A transparent score, never a promise
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-text-secondary">
              <strong className="font-semibold text-white">SkillBridge Compatibility</strong>{' '}
              measures how closely your identified skills line up with the skills a
              role asks for. It is a similarity score - it is not a hiring
              probability, and it never predicts whether you will be selected.
            </p>
          </div>

          <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="sb-glass rounded-2xl p-6">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  SkillBridge Compatibility
                </span>
                <span className="font-display text-3xl font-semibold text-brand-300">82%</span>
              </div>

              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
                <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-brand-500 to-cyan-400" />
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-300/90">Matched</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-white">
                    {['Python', 'SQL', 'Git', 'REST APIs'].map((skill) => (
                      <li key={skill} className="flex items-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-amber-300/90">Skill gaps</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-text-muted">
                    {['Docker', 'AWS'].map((skill) => (
                      <li key={skill} className="flex items-center gap-2">
                        <span className="text-amber-400/80">○</span>
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Features ---------------- */}
        <section className="pb-16">
          <div className="text-center pb-10">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              What SkillBridge does
            </h2>
            <p className="mt-2 max-w-2xl mx-auto text-sm text-text-muted">
              A complete career intelligence stack built for students and graduates.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="sb-glass rounded-2xl p-5 sb-lift">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/20">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="mt-3 font-display text-sm font-semibold text-white">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- Career pathway ---------------- */}
        <section className="pb-20">
          <div className="sb-glass rounded-2xl p-6 sm:p-8">
            <h2 className="font-display text-lg font-semibold text-white">Your career pathway</h2>
            <p className="mt-1 text-xs text-text-muted">How a resume becomes a plan.</p>

            <ol className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-2">
              {PATHWAY.map(({ icon: Icon, label }, index) => (
                <li key={label} className="flex flex-1 items-center gap-2">
                  <div className="flex flex-1 items-center gap-3 rounded-xl border border-surface-border bg-surface-elevated/30 px-3.5 py-3 sb-lift">
                    <Icon className="h-4 w-4 shrink-0 text-cyan-400" />
                    <span className="text-xs font-medium text-white">{label}</span>
                  </div>
                  {index < PATHWAY.length - 1 && (
                    <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-text-muted sm:block" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------- CTA ---------------- */}
        <section className="pb-20">
          <div className="sb-glass rounded-2xl px-6 py-10 text-center">
            <h2 className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Ready to find where your skills belong?
            </h2>
            <p className="mt-2 max-w-lg mx-auto text-sm leading-relaxed text-text-muted">
              Create an account, upload your resume and get a skill-alignment breakdown for
              every opening in the database.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:from-brand-400 hover:to-brand-500 sb-lift"
              >
                Create your account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-elevated/50 px-5 py-3 text-sm font-semibold text-text-primary transition hover:bg-surface-elevated sb-lift"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-surface-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <SkillBridgeLogo size={16} />
            SkillBridge AI · CEP project
          </span>
          <span>
            Compatibility is a skill-similarity indicator, not a hiring prediction.
          </span>
        </div>
      </footer>
    </div>
  )
}