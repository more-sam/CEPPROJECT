import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Menu,
  Search,
  Sparkles,
  Briefcase,
  GitBranch,
  Bot,
  User as UserIcon,
  Settings,
  HelpCircle,
  X,
} from 'lucide-react'

import { SkillBridgeLogo } from '../ui/SkillBridgeLogo'
import { useAuth } from '../../store/authContext'
import { RouteTransition } from '../../motion/RouteTransition'
import { duration, ease } from '../../motion/tokens'

const NAV_ITEMS = [
  {
    path: '/dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
    description: 'Career intelligence overview',
  },
  { path: '/resume', label: 'Resume', icon: Briefcase, description: 'Upload & analyze your resume' },
  { path: '/skill-gap', label: 'Skills', icon: GitBranch, description: 'Your skill profile & gaps' },
  {
    path: '/opportunities',
    label: 'Opportunities',
    icon: Briefcase,
    description: 'Discover matching roles',
  },
  { path: '/roadmap', label: 'Roadmap', icon: GitBranch, description: 'Your learning path' },
  {
    path: '/assessments',
    label: 'Assessments',
    icon: HelpCircle,
    description: 'Test & validate skills',
  },
  { path: '/assistant', label: 'AI Assistant', icon: Bot, description: 'Career intelligence chat' },
  { path: '/settings', label: 'Settings', icon: Settings, description: 'Account & preferences' },
] as const

const SIDEBAR_WIDTH = 280
const SIDEBAR_WIDTH_COLLAPSED = 72

export function AppShell() {
  const { status, user, signOut } = useAuth()
  const location = useLocation()
  const reduced = useReducedMotion()

  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
      if (e.key === 'Escape') setCommandOpen(false)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setCollapsed((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSignOut = async () => {
    await signOut()
  }

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`)

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />
  }

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH

  return (
    <div className="relative min-h-screen bg-surface-base">
      {/* Background atmospheric layer */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-mesh" aria-hidden="true" />

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: ease.out }}
            className="fixed inset-0 z-[var(--z-sticky)] bg-black/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        ref={sidebarRef}
        className="fixed left-0 top-0 z-[var(--z-sticky)] hidden h-screen flex-col border-r border-surface-border bg-surface-elevated lg:flex"
        style={{ width: sidebarWidth }}
        animate={{ width: sidebarWidth }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: duration.normal, ease: ease.out }
        }
        aria-label="Main navigation"
      >
        {/* Sidebar header */}
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-surface-border px-3">
          <Link
            to="/dashboard"
            className="flex min-w-0 flex-1 items-center gap-3"
            aria-label="SkillBridge AI home"
          >
            <SkillBridgeLogo size={32} full={!collapsed} />
          </Link>

          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.button
                type="button"
                initial={reduced ? { opacity: 1 } : { opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? { opacity: 1 } : { opacity: 0, x: -6 }}
                transition={{ duration: 0.18, ease: ease.out }}
                onClick={() => setCollapsed(true)}
                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-5 w-5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation - single LayoutGroup so the active pill slides */}
        <LayoutGroup>
          <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Main navigation">
            <ul className="space-y-1" role="list">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.path)
                return (
                  <li key={item.path} className="relative">
                    {active && !reduced ? (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-xl border border-brand-500/30 bg-brand-500/15 shadow-glow-brand"
                        transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.8 }}
                        aria-hidden="true"
                      />
                    ) : (
                      active && <div className="absolute inset-0 rounded-xl border border-brand-500/30 bg-brand-500/15" />
                    )}

                    <NavLink
                      to={item.path}
                      className={`
                        relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150
                        ${active ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay'}
                        ${collapsed ? 'justify-center' : 'justify-start'}
                      `}
                      title={collapsed ? item.description : undefined}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setMobileOpen(false)}
                    >
                      <span className="flex-shrink-0" aria-hidden="true">
                        <item.icon className="h-5 w-5" />
                      </span>

                      <AnimatePresence initial={false}>
                        {!collapsed && (
                          <motion.span
                            key="label"
                            className="truncate"
                            initial={reduced ? { opacity: 1 } : { opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={reduced ? { opacity: 1 } : { opacity: 0, x: -6 }}
                            transition={{ duration: 0.18, ease: ease.out }}
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </NavLink>
                  </li>
                )
              })}
            </ul>

            {/* Divider */}
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.12, duration: 0.22 }}
                className="my-4 border-t border-surface-border"
              />
            )}

            {/* AI Assistant quick access */}
            {!collapsed && (
              <motion.div
                initial={reduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.22, ease: ease.out }}
              >
                <NavLink
                  to="/assistant"
                  className="group flex items-center gap-3 rounded-xl border border-brand-500/20 bg-brand-500/10 px-3 py-3 text-brand-300 transition-all duration-200 hover:border-brand-500/40 hover:bg-brand-500/20"
                >
                  <span
                    className="flex-shrink-0 rounded-lg bg-brand-500/20 p-2"
                    aria-hidden="true"
                  >
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">AI Career Assistant</p>
                    <p className="text-xs text-text-muted">Ask about your career</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-text-muted transition-colors group-hover:text-brand-300" />
                </NavLink>
              </motion.div>
            )}
          </nav>
        </LayoutGroup>

        {/* Sidebar footer - user profile */}
        <div className="flex-shrink-0 border-t border-surface-border p-4">
          <AnimatePresence initial={false} mode="wait">
            {!collapsed ? (
              <motion.div
                key="expanded-footer"
                initial={reduced ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduced ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-3"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-500/20">
                  <UserIcon className="h-5 w-5 text-brand-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {(user as unknown as Record<string, unknown> & { full_name?: string }).full_name ??
                      'User'}
                  </p>
                  <p className="truncate text-xs text-text-muted">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary"
                  aria-label="Sign out"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed-footer"
                initial={reduced ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduced ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex justify-center"
              >
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary"
                  aria-label="Sign out"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* Collapsed expand trigger on mobile/sm entirely */}
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="fixed left-0 top-0 z-[var(--z-sticky)] hidden h-16 w-12 items-center justify-center border-r border-surface-border bg-surface-elevated lg:flex"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-6 w-6 text-text-secondary" />
        </button>
      )}

      {/* Mobile drawer - completely separate from the desktop sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={reduced ? { opacity: 1 } : { x: -320 }}
              animate={{ x: 0 }}
              exit={reduced ? { opacity: 1 } : { x: -320 }}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 40 }}
              className="fixed inset-y-0 left-0 z-[var(--z-sticky)] flex w-72 flex-col border-r border-surface-border bg-surface-elevated lg:hidden"
              aria-label="Main navigation"
            >
              <div className="flex h-16 items-center justify-between border-b border-surface-border px-4">
                <Link to="/dashboard" className="flex items-center gap-3">
                  <SkillBridgeLogo size={32} full />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-2 text-text-muted hover:text-text-primary hover:bg-surface-overlay"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-2 py-4">
                <ul className="space-y-1" role="list">
                  {NAV_ITEMS.map((item) => {
                    return (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          onClick={() => setMobileOpen(false)}
                          className={({ isActive: navActive }) => `
                            flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors
                            ${navActive ? 'border border-brand-500/30 bg-brand-500/15 text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay'}
                          `}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.label}
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <main
        className="flex min-h-screen flex-1 transition-[margin] duration-300"
        style={{ marginLeft: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH }}
      >
        <div className="flex w-full flex-col" style={{ minWidth: 0 }}>
          {/* Top navigation bar */}
          <header className="sticky top-0 z-[var(--z-dropdown)] flex h-16 items-center justify-between border-b border-surface-border bg-surface-base/80 px-6 backdrop-blur-xl lg:px-8">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>

              <nav
                className="hidden items-center gap-2 text-sm text-text-muted md:flex"
                aria-label="Breadcrumb"
              >
                <span className="font-mono tabular-nums">~</span>
                <span className="text-text-subtle">
                  {location.pathname
                    .split('/')
                    .filter(Boolean)
                    .join(' / ')}
                </span>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="group flex items-center gap-2 rounded-lg border border-surface-border bg-surface-overlay px-4 py-2 text-text-secondary transition-all duration-200 hover:border-brand-500/50 hover:text-text-primary"
                aria-label="Open command palette (⌘K)"
              >
                <Search className="h-4 w-4" />
                <span className="hidden text-sm font-medium sm:inline">Search…</span>
                <kbd className="hidden items-center gap-1 rounded border border-surface-border bg-surface-base px-1.5 py-0.5 font-mono text-xs text-text-subtle md:inline-flex">
                  <span>⌘</span>K
                </kbd>
              </button>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-lg border border-surface-border bg-surface-overlay px-3 py-1.5 sm:flex">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500/20">
                    <UserIcon className="h-4 w-4 text-brand-400" />
                  </div>
                  <span className="text-sm font-medium">
                    {(user as unknown as Record<string, unknown> & { full_name?: string }).full_name ??
                      'User'}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Page content with route transitions */}
          <div
            className="flex-1 p-6 lg:p-8"
            style={{ maxWidth: '1440px', width: '100%', margin: '0 auto', minWidth: 0 }}
          >
            <RouteTransition>
              <Outlet />
            </RouteTransition>
          </div>
        </div>
      </main>

      {/* Command Palette */}
      <AnimatePresence>
        {commandOpen && (
          <InlinePalette onClose={() => setCommandOpen(false)} onSignOut={handleSignOut} />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ============================================================================
   Inline command palette — same course as CommandPalette.tsx but wired through
   AnimatePresence instead of an instant mount.
   ============================================================================ */

interface InlinePaletteProps {
  onClose: () => void
  onSignOut: () => void
}

function InlinePalette({ onClose, onSignOut }: InlinePaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands = [
    {
      id: 'dashboard',
      label: 'Go to Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      shortcut: '⌘1',
    },
    { id: 'resume', label: 'Analyze Resume', path: '/resume', icon: Briefcase, shortcut: '⌘2' },
    {
      id: 'skills',
      label: 'Skill Gap Analysis',
      path: '/skill-gap',
      icon: GitBranch,
      shortcut: '⌘3',
    },
    {
      id: 'opportunities',
      label: 'Browse Opportunities',
      path: '/opportunities',
      icon: Briefcase,
      shortcut: '⌘4',
    },
    { id: 'roadmap', label: 'Learning Roadmap', path: '/roadmap', icon: GitBranch, shortcut: '⌘5' },
    {
      id: 'assessments',
      label: 'Take Assessment',
      path: '/assessments',
      icon: HelpCircle,
      shortcut: '⌘6',
    },
    { id: 'assistant', label: 'AI Career Assistant', path: '/assistant', icon: Bot, shortcut: '⌘7' },
    { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, shortcut: '⌘8' },
    { id: 'signout', label: 'Sign Out', path: '/login', icon: ArrowRight, shortcut: '' },
  ] as const

  const filtered = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.shortcut.toLowerCase().includes(query.toLowerCase()),
  )

  const selected = filtered[selectedIndex] ?? filtered[0]

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter' && selected) {
        e.preventDefault()
        if (selected.id === 'signout') {
          onSignOut()
          window.location.href = '/login'
        } else {
          window.location.href = selected.path
        }
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [filtered, selected, onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16, ease: ease.out }}
      className="fixed inset-0 z-[var(--z-command-palette)] flex items-start justify-center bg-black/50 pt-20 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.985 }}
        transition={{ duration: 0.22, ease: ease.out }}
        className="mx-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-surface-elevated shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-surface-border p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              placeholder="Type a command or search…"
              className="w-full rounded-xl border border-surface-border bg-surface-base py-3 pl-12 pr-16 font-sans text-base text-text-primary placeholder:text-text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 rounded border border-surface-border bg-surface-base px-2 py-1 font-mono text-xs text-text-subtle">
              ⎋
            </kbd>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-text-muted">No commands found</div>
          ) : (
            <ul className="divide-y divide-surface-border" role="listbox">
              {filtered.map((cmd, index) => {
                const active = index === selectedIndex
                return (
                  <li key={cmd.id} role="option" aria-selected={active}>
                    <button
                      type="button"
                      className={`
                        flex w-full cursor-pointer items-center gap-4 px-4 py-3 text-left transition-colors
                        ${active ? 'bg-brand-500/10 text-text-primary' : 'text-text-secondary hover:bg-surface-overlay'}
                      `}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => {
                        if (cmd.id === 'signout') {
                          window.location.href = '/login'
                        } else {
                          window.location.href = cmd.path
                        }
                        onClose()
                      }}
                    >
                      <span
                        className="flex-shrink-0 rounded-lg bg-surface-base p-1.5"
                        aria-hidden="true"
                      >
                        <cmd.icon className="h-5 w-5" />
                      </span>
                      <span className="flex-1 text-sm font-medium">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="rounded border border-surface-border bg-surface-base px-2 py-1 font-mono text-xs text-text-muted">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-surface-border p-3 text-center text-xs text-text-muted">
          <kbd className="rounded border border-surface-border bg-surface-base px-1.5 py-0.5 font-mono">⌘K</kbd> to open ·{' '}
          <kbd className="rounded border border-surface-border bg-surface-base px-1.5 py-0.5 font-mono">⎋</kbd>{' '}
          to close
        </div>
      </motion.div>
    </motion.div>
  )
}
