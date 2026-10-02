import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Compass,
  FileText,
  Layers,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
} from 'lucide-react'

import { AiOrb } from '../components/ui/AiOrb'
import { GlassPanel } from '../components/ui/GlassPanel'
import { SkillBridgeLogo } from '../components/ui/SkillBridgeLogo'
import { SiteHeader } from '../components/layout/SiteHeader'

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
  { icon: TrendingUp, label: 'Opportunities' },
]

export default function Landing() {
  return (
    <div className="relative min-h-dvh">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5">
        {/* ---------------- Hero ---------------- */}
        <section className="grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="sb-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-brand-300">
              <Sparkles className="h-3.5 w-3.5" />
              Career intelligence for students and graduates
            </span>

            <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
              Bridge the gap between your skills and real opportunities.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
              Upload your resume to understand your skills, discover internships that
              align with them, and follow a personalised roadmap for the gaps that
              stand between you and your next role.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:from-brand-400 hover:to-brand-500"
              >
                Analyze my resume
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/opportunities"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                <Upload className="h-4 w-4" />
                Explore opportunities
              </Link>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Free to use. Upload a PDF or DOCX resume and see your skills mapped to real
              openings in under a minute.
            </p>
          </div>

          <div className="relative grid place-items-center">
            <div className="sb-float">
              <AiOrb size={260} />
            </div>
          </div>
        </section>

        {/* ---------------- Compatibility example ---------------- */}
        <section className="grid gap-6 pb-16 lg:grid-cols-2 lg:items-center">
          <div>
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
          >
            <GlassPanel className="p-6">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium uppercase tracking-widest text-slate-500">
                  SkillBridge Compatibility
                </span>
                <span className="font-display text-3xl font-semibold text-brand-300">82%</span>
              </div>

              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-brand-500 to-aqua-400" />
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/90">
                    Matched
                  </p>
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
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/90">
                    Skill gaps
                  </p>
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
          <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            What SkillBridge does
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <GlassPanel key={title} className="flex flex-col gap-3 p-5">
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
          <GlassPanel className="p-6 sm:p-8">
            <h2 className="font-display text-lg font-semibold text-white">Your career pathway</h2>
            <p className="mt-1 text-xs text-slate-500">
              How a resume becomes a plan.
            </p>

            <ol className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-2">
              {PATHWAY.map(({ icon: Icon, label }, index) => (
                <li key={label} className="flex flex-1 items-center gap-2">
                  <div className="flex flex-1 items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-3.5 py-3">
                    <Icon className="h-4 w-4 shrink-0 text-aqua-400" />
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
          <GlassPanel className="flex flex-col items-center gap-5 px-6 py-10 text-center">
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
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:from-brand-400 hover:to-brand-500"
              >
                Create your account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
          </GlassPanel>
        </section>
      </main>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
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
