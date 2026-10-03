import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Compass,
  FileText,
  Layers,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  Zap,
  Briefcase,
} from 'lucide-react'

import { AiOrb } from '../components/ui/AiOrb'
import { GlassPanel } from '../components/ui/GlassPanel'
import { SkillBridgeLogo } from '../components/ui/SkillBridgeLogo'
import { SiteHeader } from '../components/layout/SiteHeader'
import { fetchPlatformStats, type PlatformStats } from '../services/health'
import { useCountUp } from '../hooks/useCountUp'

const FEATURES = [
  {
    icon: FileText,
    title: 'Resume intelligence',
    body: 'Upload a PDF or DOCX. We extract your skills, projects and education into a structured profile.',
  },
  {
    icon: Target,
    title: 'Skill alignment',
    body: 'See exactly which required skills you already have, and which ones are still missing.',
  },
  {
    icon: Layers,
    title: 'Learning roadmap',
    body: 'Get an ordered, prerequisite-aware path covering only the gaps that matter.',
  },
  {
    icon: TrendingUp,
    title: 'Progress tracking',
    body: 'Assessments and roadmap updates roll up into one clear view of your growth.',
  },
]

/** Signature element #3: the career pathway. */
const PATHWAY = [
  { icon: Upload, label: 'Resume' },
  { icon: Sparkles, label: 'Skill profile' },
  { icon: Target, label: 'Alignment' },
  { icon: Compass, label: 'Roadmap' },
  { icon: Briefcase, label: 'Opportunities' },
]

/** Live platform counters, fetched from the public /api/stats endpoint. */
function StatsBand() {
  const [stats, setStats] = useState<PlatformStats | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchPlatformStats()
      .then((data) => {
        if (!cancelled && data.status === 'ok') setStats(data)
      })
      .catch(() => {
        /* stats are decorative - the band simply stays hidden */
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!stats) return null

  const items = [
    { icon: Layers, value: stats.skills ?? 0, label: 'Skills mapped' },
    { icon: Target, value: stats.jobs ?? 0, label: 'Live opportunities' },
    { icon: Building2, value: stats.companies ?? 0, label: 'Hiring companies' },
    { icon: ClipboardCheck, value: stats.assessments ?? 0, label: 'Skill assessments' },
  ]

  return (
    <section className="pb-16" aria-label="Platform statistics">
      <GlassPanel className="sb-hud sb-scan grid grid-cols-2 gap-6 px-6 py-6 sm:grid-cols-4">
        {items.map(({ icon: Icon, value, label }) => (
          <StatItem key={label} icon={Icon} value={value} label={label} />
        ))}
      </GlassPanel>
    </section>
  )
}

function StatItem({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Layers
  value: number
  label: string
}) {
  const animated = useCountUp(value, 1100)
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-cyan-400 ring-1 ring-cyan-400/20">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="font-display text-xl font-semibold tabular-nums text-white sm:text-2xl">
          {Math.round(animated).toLocaleString()}
        </p>
        <p className="sb-mono-label text-slate-500">{label}</p>
      </div>
    </div>
  )
}

/** Skill network visualization for hero */
function HeroSkillNetwork() {
  const skills = [
    { name: 'Python', x: 15, y: 45, category: 'backend' },
    { name: 'React', x: 85, y: 25, category: 'frontend' },
    { name: 'SQL', x: 35, y: 75, category: 'data' },
    { name: 'Git', x: 65, y: 15, category: 'tools' },
    { name: 'Docker', x: 90, y: 60, category: 'infra' },
    { name: 'AWS', x: 10, y: 60, category: 'infra' },
    { name: 'TypeScript', x: 55, y: 40, category: 'frontend' },
    { name: 'Machine Learning', x: 30, y: 30, category: 'ai' },
    { name: 'REST APIs', x: 75, y: 55, category: 'backend' },
    { name: 'PostgreSQL', x: 45, y: 85, category: 'data' },
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
          <stop offset="100%" stopColor="#d946ef" stopOpacity="0.4" />
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
      {skills.map((skill) => (
        <g key={skill.name} className="sb-rise" style={{ animationDelay: `${Math.random() * 0.5}s` }}>
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
    <div className="relative min-h-dvh">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-5">
        {/* ---------------- Hero ---------------- */}
        <section className="relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="sb-rise" style={{ animationDelay: '0ms' }}>
            <p className="sb-mono-label mt-6 flex items-center gap-2 text-cyan-400/80">
              <span className="sb-live-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              AI Career Intelligence Platform
            </p>

            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              <span className="sb-shimmer-text">
                Bridge the gap between your skills and real opportunities.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
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
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:border-white/20 sb-lift"
              >
                <Zap className="h-4 w-4" />
                Explore opportunities
              </Link>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Free to use. Upload a PDF or DOCX resume and see your skills mapped to real
              openings in under a minute.
            </p>
          </div>

          <div className="relative grid place-items-center">
            <div className="relative sb-float">
              <AiOrb size={300} />
              <HeroSkillNetwork />
            </div>
          </div>
        </section>

        {/* ---------------- Live platform stats ---------------- */}
        <StatsBand />

        {/* ---------------- Compatibility example ---------------- */}
        <section className="grid gap-6 pb-16 lg:grid-cols-2 lg:items-center">
          <div className="sb-rise" style={{ animationDelay: '100ms' }}>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              A transparent score, never a promise
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-400">
              <strong className="font-semibold text-slate-300">SkillBridge Compatibility</strong>{' '}
              measures how closely your identified skills line up with the skills a
              role asks for. It is a similarity score - it is not a hiring
              probability, and it never predicts whether you will be selected.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="sb-rise"
            style={{ animationDelay: '200ms' }}
          >
            <GlassPanel className="p-6 sb-hud sb-scan">
              <div className="flex items-baseline justify-between">
                <span className="sb-mono-label text-slate-500">
                  SkillBridge Compatibility
                </span>
                <span className="font-display text-3xl font-semibold text-brand-300">82%</span>
              </div>

              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-brand-500 to-cyan-400" />
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="sb-mono-label text-emerald-300/90">Matched</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
                    {['Python', 'SQL', 'Git', 'REST APIs'].map((skill) => (
                      <li key={skill} className="flex items-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="sb-mono-label text-amber-300/90">Skill gaps</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-400">
                    {['Docker', 'FastAPI'].map((skill) => (
                      <li key={skill} className="flex items-center gap-2">
                        <span className="text-amber-400/80">○</span>
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        </section>

        {/* ---------------- Features ---------------- */}
        <section className="pb-16">
          <div className="text-center pb-10">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              What SkillBridge does
            </h2>
            <p className="mt-2 max-w-2xl mx-auto text-sm text-slate-400">
              A complete career intelligence stack built for students and graduates.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <GlassPanel key={title} className="sb-hud sb-lift flex flex-col gap-3 p-5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/20">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="font-display text-sm font-semibold text-white">{title}</h3>
                <p className="text-xs leading-relaxed text-slate-400">{body}</p>
              </GlassPanel>
            ))}
          </div>
        </section>

        {/* ---------------- Career pathway ---------------- */}
        <section className="pb-20">
          <GlassPanel className="p-6 sm:p-8 sb-hud sb-lift">
            <h2 className="font-display text-lg font-semibold text-white">Your career pathway</h2>
            <p className="mt-1 text-xs text-slate-500">How a resume becomes a plan.</p>

            <ol className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-2">
              {PATHWAY.map(({ icon: Icon, label }, index) => (
                <li key={label} className="flex flex-1 items-center gap-2">
                  <div className="flex flex-1 items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-3.5 py-3 sb-lift">
                    <Icon className="h-4 w-4 shrink-0 text-cyan-400" />
                    <span className="text-xs font-medium text-slate-300">{label}</span>
                  </div>
                  {index < PATHWAY.length - 1 && (
                    <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-slate-600 sm:block" />
                  )}
                </li>
              ))}
            </ol>
          </GlassPanel>
        </section>

        {/* ---------------- CTA ---------------- */}
        <section className="pb-20">
          <GlassPanel className="flex flex-col items-center gap-5 px-6 py-10 text-center sb-hud sb-lift">
            <h2 className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Ready to find where your skills belong?
            </h2>
            <p className="max-w-lg text-sm leading-relaxed text-slate-400">
              Create an account, upload your resume and get a skill-alignment breakdown for
              every opening in the database.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:from-brand-400 hover:to-brand-500 sb-lift"
              >
                Create your account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 sb-lift"
              >
                Sign in
              </Link>
            </div>
          </GlassPanel>
        </section>
      </main>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
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