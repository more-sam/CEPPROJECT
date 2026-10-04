import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Briefcase,
  Building2,
  Compass,
  GitBranch,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { HeroCareerNetwork } from '../components/HeroCareerNetwork'
import { SkillBridgeLogo } from '../components/ui/SkillBridgeLogo'
import { Reveal, Stagger, StaggerItem } from '../motion/Reveal'
import { usePrefersReducedMotion } from '../motion/usePrefersReducedMotion'
import { useCountUp } from '../hooks/useCountUp'
import { duration, ease } from '../motion/tokens'
import { fetchPlatformStats, type PlatformStats } from '../services/health'

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

// ---------------------------------------------------------------------------
// Stats band
// ---------------------------------------------------------------------------

function StatsBand() {
  const [stats, setStats] = useState<PlatformStats | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchPlatformStats()
      .then((data) => {
        if (!cancelled && data.status === 'ok') setStats(data)
      })
      .catch(() => {
        /* decorative */
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!stats) return null

  const items = [
    { icon: GitBranch, value: stats.skills ?? 0, label: 'Skills mapped' },
    { icon: Target, value: stats.jobs ?? 0, label: 'Live opportunities' },
    { icon: Building2, value: stats.companies ?? 0, label: 'Hiring companies' },
    { icon: Briefcase, value: stats.assessments ?? 0, label: 'Skill assessments' },
  ]

  return (
    <Reveal amount={0.22} className="pb-16" as="section">
      <Stagger className="sb-glass grid gap-4 rounded-2xl p-6 sm:grid-cols-4" step={0.07}>
        {items.map(({ icon: Icon, value, label }) => {
          return (
            <StaggerItem key={label} className="flex items-center gap-3">
              <StatCell Icon={Icon} value={value} label={label} />
            </StaggerItem>
          )
        })}
      </Stagger>
    </Reveal>
  )
}

function StatCell({
  Icon,
  value,
  label,
}: {
  Icon: typeof GitBranch
  value: number
  label: string
}) {
  // Count-up is paused automatically when the tab is hidden and under reduced motion.
  const animated = useCountUp(value, 900)
  return (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/20">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="font-display text-xl font-semibold tabular-nums text-white sm:text-2xl">
          {Math.round(animated).toLocaleString()}
        </p>
        <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</p>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Landing
// ---------------------------------------------------------------------------

export default function Landing() {
  const reduced = usePrefersReducedMotion()
  const reducedMotion = useReducedMotion()

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric backdrop is rendered globally in App.tsx; a faint mesh wash
          here provides extra depth behind the hero without another full layer. */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-mesh opacity-80" aria-hidden="true" />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0.001 : 0.32, ease: 'easeOut' }}
        className="sticky top-0 z-30 border-b border-white/5 bg-surface-base/60 backdrop-blur-xl"
      >
          <div className="mx-auto flex w-[90vw] max-w-[1600px] items-center justify-between gap-4 px-[6vw] md:px-[7vw] lg:px-[8vw] xl:px-[9vw] py-3.5">
              <Link to="/" className="flex items-center gap-2.5" aria-label="SkillBridge AI home">
                <SkillBridgeLogo size={28} variant="full" animated={false} />
              </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
            <Link
              to="/opportunities"
              className="text-xs font-medium text-slate-400 transition-colors hover:text-white"
            >
              Opportunities
            </Link>
            <Link
              to="/dashboard"
              className="text-xs font-medium text-slate-400 transition-colors hover:text-white"
            >
              Dashboard
            </Link>
            <Link
              to="/assistant"
              className="text-xs font-medium text-slate-400 transition-colors hover:text-white"
            >
              AI Assistant
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-3 py-2 text-xs font-medium text-slate-300 transition hover:text-white"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:from-brand-400 hover:to-brand-500"
            >
              Get started
            </Link>
          </div>
        </div>
      </motion.header>

      <main className="mx-auto w-full max-w-[1550px] px-[5vw] lg:px-[5vw] xl:px-[5vw]">
        {/* ---------------- Hero ----------------
            The grid uses minmax(0, Nfr) rather than bare Nfr so a column can
            never be forced wider than its track by its content's min-content
            size. Combined with min-width:0 on both children this is what keeps
            the document exactly one viewport wide at every size. */}
        <section className="relative grid items-center gap-10 py-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14 min-h-[calc(100vh-80px)] lg:py-0">
          <div className="relative min-w-0 max-w-[640px]" style={{ zIndex: 10 }}>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reducedMotion ? 0 : 0.08, duration: 0.28, ease: 'easeOut' }}
              className="mt-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-cyan-400/85"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true">
                <span className="block h-full w-full animate-pulse rounded-full bg-emerald-400" />
              </span>
              AI Career Intelligence Platform
            </motion.p>

            {/* Headline: words reveal with a gentle stagger so the promise arrives
                in beats rather than as a single wall of colour. */}
            <motion.h1
              className="mt-3 hidden lg:block font-display font-semibold leading-[1.06] tracking-tight text-[clamp(3rem,4.2vw,5rem)]"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: { staggerChildren: reducedMotion ? 0 : 0.08, delayChildren: 0.12 },
                },
              }}
            >
              {['Bridge the gap', 'between your skills', 'and real opportunities.'].map(
                (line, i) => (
                  <motion.span
                    key={line}
                    className="block bg-gradient-to-r from-indigo-300 via-violet-300 to-cyan-200 bg-clip-text text-transparent"
                    variants={{
                      hidden: { opacity: 0, y: reducedMotion ? 0 : 14 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] } },
                    }}
                    style={i > 0 ? { marginTop: '0.04em' } : {}}
                  >
                    {line}
                  </motion.span>
                ),
              )}
            </motion.h1>

            {/* Mobile headline: no stagger variant, simpler layout. */}
            <h1 className="mt-3 block lg:hidden font-display text-[2.2rem] font-semibold leading-[1.08] tracking-tight sm:text-[2.8rem]">
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-cyan-200 bg-clip-text text-transparent">
                Bridge the gap between your skills and real opportunities.
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reducedMotion ? 0 : 0.44, duration: 0.34, ease: 'easeOut' }}
              className="mt-4 max-w-[620px] text-[15px] leading-relaxed text-text-secondary sm:text-base"
            >
              Upload your resume to understand your skills, discover internships that align with them,
              and follow a personalised roadmap for the gaps that stand between you and your next role.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reducedMotion ? 0 : 0.52, duration: 0.34, ease: 'easeOut' }}
              className="mt-7 flex flex-wrap items-center gap-3"
            >
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:from-brand-400 hover:to-brand-500 active:scale-[0.98]"
              >
                Analyze my resume
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/opportunities"
                className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-elevated/60 px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-500/45 hover:bg-surface-elevated active:scale-[0.98]"
              >
                <Zap className="h-4 w-4" />
                Explore opportunities
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.72, duration: 0.32 }}
              className="mt-3 text-xs text-text-muted"
            >
              Free to use. Upload a PDF or DOCX resume and see your skills mapped to real openings in
              under a minute.
            </motion.p>
          </div>

          {/* min-width:0 lets the track shrink; overflow stays visible so the
              3D scene is not flattened by a clipping ancestor. */}
          <div className="relative min-w-0 overflow-visible">
            <HeroCareerNetwork />
          </div>
        </section>

        {/* ---------------- Live platform stats ---------------- */}
        <StatsBand />

        {/* ---------------- Compatibility example ---------------- */}
        <Reveal amount={0.18} className="grid gap-6 pb-16 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              A transparent score, never a promise
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-text-secondary">
              <strong className="font-semibold text-white">SkillBridge Compatibility</strong> measures how
              closely your identified skills line up with the skills a role asks for. It is a similarity
              score — it is not a hiring probability, and it never predicts whether you will be selected.
            </p>
          </div>

          <motion.div
            className="sb-glass rounded-2xl p-6"
            whileHover={reducedMotion ? undefined : { y: -3, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26, mass: 0.7 }}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                SkillBridge Compatibility
              </span>
              <span className="font-display text-3xl font-semibold text-brand-300">82%</span>
            </div>

            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400"
                initial={{ width: 0 }}
                whileInView={{ width: '82%' }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: duration.viz, ease: ease.out, delay: 0.2 }}
              />
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-300/90">Matched</p>
                <ul className="mt-2 space-y-1.5 text-sm text-white">
                  {['Python', 'SQL', 'Git', 'REST APIs'].map((skill, i) => (
                    <motion.li
                      key={skill}
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, x: -6 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08, duration: 0.26, ease: 'easeOut' }}
                    >
                      <span className="text-emerald-400">✓</span>
                      {skill}
                    </motion.li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-amber-300/90">Skill gaps</p>
                <ul className="mt-2 space-y-1.5 text-sm text-text-muted">
                  {['Docker', 'AWS'].map((skill, i) => (
                    <motion.li
                      key={skill}
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, x: -6 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 + 0.18, duration: 0.26, ease: 'easeOut' }}
                    >
                      <span className="text-amber-400/80">○</span>
                      {skill}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </Reveal>

        {/* ---------------- Features ---------------- */}
        <Reveal amount={0.12} className="pb-16" as="section">
          <div className="pb-8 text-center">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              What SkillBridge does
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-text-muted">
              A complete career intelligence stack built for students and graduates.
            </p>
          </div>

          <Stagger
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            step={0.07}
            lead={0.04}
            amount={0.1}
            as="div"
          >
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <StaggerItem
                key={title}
                className="sb-glass group rounded-2xl p-5 transition hover:-translate-y-1 hover:border-brand-500/30 hover:shadow-glass-hover"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/20 transition group-hover:bg-brand-500/20 group-hover:ring-brand-400/30">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="mt-3 font-display text-sm font-semibold text-white">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">{body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </Reveal>

        {/* ---------------- Career pathway ---------------- */}
        <Reveal amount={0.15} className="pb-20" as="section">
          <div className="sb-glass rounded-2xl p-6 sm:p-8">
            <h2 className="font-display text-lg font-semibold text-white">Your career pathway</h2>
            <p className="mt-1 text-xs text-text-muted">How a resume becomes a plan.</p>

            <Stagger
              className="mt-6 grid grid-cols-1 gap-3 sm:flex sm:flex-row sm:items-stretch sm:gap-2"
              step={0.07}
              lead={0.06}
              amount={0.12}
              as="ol"
            >
              {PATHWAY.map(({ icon: Icon, label }, index) => (
                <StaggerItem
                  key={label}
                  // `min-w-0` is load-bearing: without it each flex item refuses to
                  // shrink below its content's min-content width, so the row of five
                  // labels plus four chevrons overflows the viewport at ~640-720px
                  // and gives the whole document a horizontal scrollbar.
                  className="flex min-w-0 flex-1 items-center gap-2"
                  as="li"
                >
                  <motion.div
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-surface-border bg-surface-elevated/30 px-3.5 py-3"
                    whileHover={reduced ? undefined : { y: -2, scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.6 }}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
                    <span className="min-w-0 truncate text-xs font-medium text-white">{label}</span>
                  </motion.div>
                  {index < PATHWAY.length - 1 && (
                    <ArrowRight
                      className="hidden h-3.5 w-3.5 shrink-0 text-text-muted sm:block"
                      aria-hidden="true"
                    />
                  )}
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </Reveal>

        {/* ---------------- CTA ---------------- */}
        <Reveal amount={0.18} className="pb-20" as="section">
          <div className="sb-glass px-6 py-10 text-center rounded-2xl">
            <h2 className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Ready to find where your skills belong?
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-text-muted">
              Create an account, upload your resume and get a skill-alignment breakdown for every opening
              in the database.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:from-brand-400 hover:to-brand-500 active:scale-[0.98]"
              >
                Create your account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-elevated/50 px-5 py-3 text-sm font-semibold text-text-primary transition hover:bg-surface-elevated active:scale-[0.98]"
              >
                Sign in
              </Link>
            </div>
          </div>
        </Reveal>
      </main>

      <footer className="border-t border-surface-border">
          <div className="mx-auto flex w-[90vw] max-w-[1600px] flex-col gap-2 px-[6vw] md:px-[7vw] lg:px-[8vw] xl:px-[9vw] py-6 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <SkillBridgeLogo size={16} />
            SkillBridge AI · CEP project
          </span>
          <span>Compatibility is a skill-similarity indicator, not a hiring prediction.</span>
        </div>
      </footer>
    </div>
  )
}
