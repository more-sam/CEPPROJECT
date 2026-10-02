import { Menu, X } from 'lucide-react'
import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { ContentLoader } from './PageLoader'
import { SkillBridgeLogo } from '../ui/SkillBridgeLogo'
import { Sidebar } from './Sidebar'

/**
 * Authenticated shell (spec §11): a glass sidebar on desktop, a slide-over
 * drawer on mobile. The mobile bar is a real top bar, not a shrunken desktop
 * sidebar.
 */
export function AppLayout({ children }: { children?: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  // Any route change closes the drawer so it never covers the new page.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/8 bg-ink-950/70 backdrop-blur-xl lg:block">
        <Sidebar />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/8 bg-ink-950/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="flex items-center gap-2">
          <SkillBridgeLogo size={24} />
          <span className="font-display text-sm font-semibold text-white">
            SkillBridge <span className="text-brand-300">AI</span>
          </span>
        </span>
        <span className="w-9" />
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="sb-glass absolute inset-y-0 left-0 w-72 rounded-none">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/8 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          {/* Pages are lazily loaded per route, so the fallback lives here - the
              sidebar stays visible while a page chunk arrives. */}
          <Suspense fallback={<ContentLoader />}>{children ?? <Outlet />}</Suspense>
        </div>
      </main>
    </div>
  )
}
