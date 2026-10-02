import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { GlassPanel } from '../components/ui/GlassPanel'

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <GlassPanel className="max-w-md p-8 text-center">
        <p className="font-display text-4xl font-semibold text-brand-300">404</p>
        <h1 className="mt-2 font-display text-lg font-semibold text-white">Page not found</h1>
        <p className="mt-2 text-sm text-slate-400">
          That route does not exist. Check the address, or head back to the dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to landing
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25"
          >
            Go to dashboard
          </Link>
        </div>
      </GlassPanel>
    </div>
  )
}
