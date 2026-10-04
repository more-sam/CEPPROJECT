import { useState, useEffect, useRef } from 'react'
import { Link, Outlet, useLocation, NavLink, Navigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Menu, Search, Sparkles, LayoutDashboard, Briefcase, GitBranch, Bot, User as UserIcon, Settings, HelpCircle, ArrowRight } from 'lucide-react'

import { SkillBridgeLogo } from '../ui/SkillBridgeLogo'
import { useAuth } from '../../store/authContext'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard, description: 'Career intelligence overview' },
  { path: '/resume', label: 'Resume', icon: Briefcase, description: 'Upload & analyze your resume' },
  { path: '/skill-gap', label: 'Skills', icon: GitBranch, description: 'Your skill profile & gaps' },
  { path: '/opportunities', label: 'Opportunities', icon: Briefcase, description: 'Discover matching roles' },
  { path: '/roadmap', label: 'Roadmap', icon: GitBranch, description: 'Your learning path' },
  { path: '/assessments', label: 'Assessments', icon: HelpCircle, description: 'Test & validate skills' },
  { path: '/assistant', label: 'AI Assistant', icon: Bot, description: 'Career intelligence chat' },
  { path: '/settings', label: 'Settings', icon: Settings, description: 'Account & preferences' },
] as const

const SIDEBAR_WIDTH = 280
const SIDEBAR_WIDTH_COLLAPSED = 72

export function AppShell() {
  const { status, user, signOut } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
      // Escape to close command palette
      if (e.key === 'Escape') {
        setCommandOpen(false)
      }
      // Cmd/Ctrl + B to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setCollapsed(!collapsed)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [collapsed])

  const handleSignOut = async () => {
    await signOut()
  }

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="relative min-h-screen bg-surface-base">
      {/* Background atmospheric layer */}
      <div className="fixed inset-0 bg-mesh pointer-events-none -z-10" aria-hidden="true" />

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[var(--z-sticky)] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className="fixed left-0 top-0 z-[var(--z-sticky)] flex flex-col h-screen bg-surface-elevated border-r border-surface-border transition-all duration-300 ease-out lg:translate-x-0"
        style={{
          width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
          transform: mobileOpen ? 'translateX(0)' : collapsed ? 'translateX(0)' : 'translateX(0)',
        }}
        aria-label="Main navigation"
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-surface-border flex-shrink-0">
          <Link to="/dashboard" className="flex items-center gap-3 flex-1 min-w-0" aria-label="SkillBridge AI home">
            <SkillBridgeLogo size={32} full={!collapsed} />
          </Link>
          
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2" aria-label="Main navigation">
          <ul className="space-y-1" role="list">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.path)
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                      ${isActive
                        ? 'bg-brand-500/15 text-text-primary border border-brand-500/30 shadow-glow-brand'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay'
                      }
                      ${collapsed ? 'justify-center' : 'justify-start'}
                    `}
                    title={collapsed ? item.description : undefined}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="flex-shrink-0" aria-hidden="true">
                      <item.icon className="h-5 w-5" />
                    </span>
                    {!collapsed && (
                      <span className="font-medium text-sm truncate">{item.label}</span>
                    )}
                    {active && !collapsed && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" aria-hidden="true" />
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>

          {/* Divider */}
          {!collapsed && (
            <div className="my-4 border-t border-surface-border" />
          )}

          {/* AI Assistant quick access */}
          {!collapsed && (
            <NavLink
              to="/assistant"
              className="flex items-center gap-3 px-3 py-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 hover:bg-brand-500/20 hover:border-brand-500/40 transition-all duration-200 group"
            >
              <span className="flex-shrink-0 p-2 rounded-lg bg-brand-500/20" aria-hidden="true">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">AI Career Assistant</p>
                <p className="text-xs text-text-muted">Ask about your career</p>
              </div>
              <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-brand-300 transition-colors" />
            </NavLink>
          )}
        </nav>

{/* Sidebar footer - user profile */}
          <div className="p-4 border-t border-surface-border flex-shrink-0">
            {!collapsed ? (
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{(user as unknown as Record<string, unknown> & { full_name?: string }).full_name ?? 'User'}</p>
                  <p className="text-xs text-text-muted truncate">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors"
                  aria-label="Sign out"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSignOut}
                className="mx-auto p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors"
                aria-label="Sign out"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
          </div>
      </aside>

      {/* Expanded sidebar trigger on mobile/collapsed */}
      {collapsed && !mobileOpen && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="fixed left-0 top-0 z-[var(--z-sticky)] h-16 w-12 bg-surface-elevated border-r border-surface-border flex items-center justify-center lg:hidden"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-6 w-6 text-text-secondary" />
        </button>
      )}

      {/* Main content area */}
      <main
        className="flex-1 min-h-screen transition-all duration-300 lg:ml-[280px]"
        style={{ marginLeft: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH }}
      >
        {/* Top navigation bar */}
        <header className="sticky top-0 z-[var(--z-dropdown)] h-16 bg-surface-base/80 backdrop-blur-xl border-b border-surface-border flex items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            {/* Breadcrumbs would go here */}
            <nav className="hidden md:flex items-center gap-2 text-sm text-text-muted" aria-label="Breadcrumb">
              <span className="font-mono-tabular">~</span>
              <span className="text-text-subtle">{location.pathname.split('/').filter(Boolean).join(' / ')}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Command palette trigger */}
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-overlay border border-surface-border text-text-secondary hover:text-text-primary hover:border-brand-500/50 transition-all duration-200 group"
              aria-label="Open command palette (⌘K)"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline font-medium text-sm">Search...</span>
              <kbd className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-text-subtle bg-surface-base border border-surface-border font-mono">
                <span>⌘</span>K
              </kbd>
            </button>

            {/* User menu - simplified for now */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-overlay border border-surface-border">
                <div className="w-8 h-8 rounded-xl bg-brand-500/20 flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-brand-400" />
                </div>
                <span className="font-medium text-sm">{(user as unknown as Record<string, unknown> & { full_name?: string }).full_name ?? 'User'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6 lg:p-8" style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>

      {/* Command Palette */}
      {commandOpen && (
        <CommandPalette onClose={() => setCommandOpen(false)} onSignOut={handleSignOut} />
      )}
    </div>
  )
}

/* ============================================================================
   Command Palette
   ============================================================================ */

interface CommandPaletteProps {
  onClose: () => void
  onSignOut: () => void
}

function CommandPalette({ onClose, onSignOut }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands = [
    { id: 'dashboard', label: 'Go to Dashboard', path: '/dashboard', icon: LayoutDashboard, shortcut: '⌘1' },
    { id: 'resume', label: 'Analyze Resume', path: '/resume', icon: Briefcase, shortcut: '⌘2' },
    { id: 'skills', label: 'Skill Gap Analysis', path: '/skill-gap', icon: GitBranch, shortcut: '⌘3' },
    { id: 'opportunities', label: 'Browse Opportunities', path: '/opportunities', icon: Briefcase, shortcut: '⌘4' },
    { id: 'roadmap', label: 'Learning Roadmap', path: '/roadmap', icon: GitBranch, shortcut: '⌘5' },
    { id: 'assessments', label: 'Take Assessment', path: '/assessments', icon: HelpCircle, shortcut: '⌘6' },
    { id: 'assistant', label: 'AI Career Assistant', path: '/assistant', icon: Bot, shortcut: '⌘7' },
    { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, shortcut: '⌘8' },
    { id: 'signout', label: 'Sign Out', path: '/login', icon: ArrowRight, shortcut: '' },
  ] as const

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.shortcut.toLowerCase().includes(query.toLowerCase())
  )

  const selected = filtered[selectedIndex] || filtered[0]

  useEffect(() => {
    inputRef.current?.focus()
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
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [query, filtered, onClose])

  return (
    <div className="fixed inset-0 z-[var(--z-command-palette)] flex items-start justify-center pt-20" onClick={onClose}>
      <div className="w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="sb-glass-strong rounded-2xl overflow-hidden shadow-2xl animate-scale-in">
          <div className="p-4 border-b border-surface-border">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                placeholder="Type a command or search..."
                className="w-full pl-12 pr-4 py-3 bg-surface-base border border-surface-border rounded-xl text-text-primary placeholder-text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-sans text-base"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-xs text-text-subtle bg-surface-base border border-surface-border font-mono">
                ⎋
              </kbd>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-text-muted">
                No commands found
              </div>
            ) : (
              <ul className="divide-y divide-surface-border" role="listbox">
                {filtered.map((cmd, index) => (
                  <li
                    key={cmd.id}
                    role="option"
                    aria-selected={index === selectedIndex}
                    className={`
                      flex items-center gap-4 px-4 py-3 transition-colors cursor-pointer
                      ${index === selectedIndex
                        ? 'bg-brand-500/10 text-text-primary'
                        : 'hover:bg-surface-overlay text-text-secondary'
                      }
                    `}
                    onClick={() => {
                      if (cmd.id === 'signout') {
                        window.location.href = '/login'
                      } else {
                        window.location.href = cmd.path
                      }
                      onClose()
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <span className="flex-shrink-0 p-1.5 rounded-lg bg-surface-base" aria-hidden="true">
                      <cmd.icon className="h-5 w-5" />
                    </span>
                    <span className="font-medium text-sm flex-1">{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="px-2 py-1 rounded text-xs text-text-muted bg-surface-base border border-surface-border font-mono">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-3 border-t border-surface-border text-center text-xs text-text-muted">
            <kbd className="px-1.5 py-0.5 rounded bg-surface-base border border-surface-border font-mono">⌘K</kbd>{' '}
            to open • <kbd className="px-1.5 py-0.5 rounded bg-surface-base border border-surface-border font-mono">⎋</kbd> to close
          </div>
        </div>
      </div>
    </div>
  )
}