import { Menu, Search, X } from 'lucide-react'
import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { CommandPalette } from './CommandPalette'
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
  const [paletteOpen, setPaletteOpen] = useState(false)
  const location = useLocation()

  // Close the drawer on any route change so it never covers the new page.
  // Derived during render (React's "adjust state when a prop changes" pattern)
  // instead of an effect that fires an extra render.
  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setDrawerOpen(false)
  }

  // ⌘K / Ctrl+K opens the command palette from anywhere in the shell.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    const onOpenPalette = () => setPaletteOpen(true)
    window.addEventListener('keydown', onKeyDown)
    // The sidebar's search button fires this; keeps the palette state lifted.
    window.addEventListener('sb:open-palette', onOpenPalette)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('sb:open-palette', onOpenPalette)
    }
  }, [])

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
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('sb:open-palette'))}
          aria-label="Search (command palette)"
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300"
        >
          <Search className="h-4 w-4" />
        </button>
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
          <Suspense fallback={<ContentLoader />}>
            {/* Keyed on pathname so each route fades in fresh. */}
            <div key={location.pathname} className="sb-rise">
              {children ?? <Outlet />}
            </div>
          </Suspense>
        </div>
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
