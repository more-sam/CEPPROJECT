import {
  Compass,
  FileText,
  LogOut,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { NAV_ITEMS } from './navigation'
import { useAuth } from '../../store/authContext'
import { listJobs } from '../../services/jobs'
import type { OpportunityCard as OpportunityCardType } from '../../types'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

interface PaletteAction {
  id: string
  label: string
  hint?: string
  icon: typeof Compass
  run: () => void
}

/**
 * ⌘K / Ctrl+K command palette: jump to any page, run common actions, and
 * search live opportunities without leaving the current screen.
 * Decorative-only motion; fully keyboard driven (arrows + enter + escape).
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [query, setQuery] = useState('')
  // Results are stored together with the query they answered so stale entries
  // can be hidden by comparison during render instead of cleared in an effect.
  const [searchResult, setSearchResult] = useState<{
    q: string
    items: OpportunityCardType[]
  }>({ q: '', items: [] })
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const trimmedQuery = query.trim()
  // Hide anything fetched for a different (or too short) query.
  // Memoized so the [] fallback keeps a stable identity across renders.
  const jobResults = useMemo(
    () => (searchResult.q === trimmedQuery ? searchResult.items : []),
    [searchResult, trimmedQuery],
  )
  // "Searching" covers the debounce window and the in-flight fetch.
  const searching = trimmedQuery.length >= 2 && searchResult.q !== trimmedQuery

  // Reset when the palette opens: React's adjust-state-during-render pattern
  // rather than an effect that fires an extra render.
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) {
      setQuery('')
      setSearchResult({ q: '', items: [] })
      setActiveIndex(0)
    }
  }

  // Focus the input after paint so the panel is mounted (external DOM system).
  useEffect(() => {
    if (!open) return undefined
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open])

  const go = useCallback(
    (path: string) => {
      onClose()
      navigate(path)
    },
    [navigate, onClose],
  )

  const actions: PaletteAction[] = useMemo(
    () => [
      ...NAV_ITEMS.map(({ to, label, hint, icon }) => ({
        id: `nav-${to}`,
        label,
        hint,
        icon,
        run: () => go(to),
      })),
      {
        id: 'act-upload',
        label: 'Upload a resume',
        hint: 'Analyze a PDF or DOCX',
        icon: FileText,
        run: () => go('/resume'),
      },
      {
        id: 'act-ask',
        label: 'Ask the AI Career Assistant',
        hint: 'Career questions, answered',
        icon: Sparkles,
        run: () => go('/assistant'),
      },
      {
        id: 'act-signout',
        label: 'Sign out',
        hint: 'End this session',
        icon: LogOut,
        run: () => {
          onClose()
          void signOut()
        },
      },
    ],
    [go, onClose, signOut],
  )

  // Live opportunity search (debounced). Only the async fetch touches state,
  // and always after the timer, so nothing is set synchronously in the effect.
  useEffect(() => {
    if (!open || trimmedQuery.length < 2) return undefined

    let cancelled = false
    const timer = window.setTimeout(() => {
      listJobs({ q: trimmedQuery, page: 1, page_size: 5 })
        .then((page) => {
          if (!cancelled) {
            setSearchResult({ q: trimmedQuery, items: page.items ?? [] })
          }
        })
        .catch(() => {
          if (!cancelled) setSearchResult({ q: trimmedQuery, items: [] })
        })
    }, 280)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, trimmedQuery])

  const filteredActions = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return actions
    return actions.filter(
      (action) =>
        action.label.toLowerCase().includes(trimmed) ||
        (action.hint ?? '').toLowerCase().includes(trimmed),
    )
  }, [actions, query])

  // One flat list drives the roving active index: actions first, then jobs.
  const rows = useMemo(() => {
    const actionRows = filteredActions.map((action) => ({
      type: 'action' as const,
      id: action.id,
      label: action.label,
      hint: action.hint,
      icon: action.icon,
      run: action.run,
    }))
    const jobRows = jobResults.map((job) => ({
      type: 'job' as const,
      id: `job-${job.id}`,
      label: job.title,
      hint: [job.company?.name, job.location].filter(Boolean).join(' · '),
      icon: Compass,
      // The Opportunities page reads ?q= from the URL, so the palette hands
      // off the same query that produced these results.
      run: () => go(`/opportunities?q=${encodeURIComponent(query.trim())}`),
    }))
    return [...actionRows, ...jobRows]
  }, [filteredActions, jobResults, query, go])

  // Keep the active row in view during keyboard navigation. When results
  // shrink, the index is clamped here during render instead of in an effect.
  const safeIndex = activeIndex < rows.length ? activeIndex : 0
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const active = list.children[safeIndex] as HTMLElement | undefined
    active?.scrollIntoView({ block: 'nearest' })
  }, [safeIndex])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((index) => (rows.length ? (index + 1) % rows.length : 0))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((index) => (rows.length ? (index - 1 + rows.length) % rows.length : 0))
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        rows[safeIndex]?.run()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, rows, safeIndex])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="sb-glass sb-hud relative w-full max-w-xl overflow-hidden rounded-2xl"
      >
        {/* Search head */}
        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-aqua-400" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            placeholder="Jump to a page, search roles…"
            aria-label="Command palette search"
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          {searching && (
            <span className="sb-mono-label text-aqua-400/80" aria-live="polite">
              searching
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-500 transition hover:bg-white/8 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Results */}
        <ul ref={listRef} className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {rows.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-slate-500">
              No matches for “{query.trim()}”.
            </li>
          )}
          {rows.map((row, index) => {
            const Icon = row.icon
            const isActive = index === safeIndex
            return (
              <li key={row.id} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={row.run}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    isActive ? 'bg-brand-500/15 ring-1 ring-brand-400/25' : 'hover:bg-white/5'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isActive ? 'text-aqua-400' : 'text-slate-500'}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-slate-200">{row.label}</span>
                    {row.hint && (
                      <span className="block truncate text-[11px] text-slate-500">{row.hint}</span>
                    )}
                  </span>
                  {row.type === 'job' && (
                    <span className="sb-mono-label shrink-0 text-slate-600">role</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        {/* Footer hints */}
        <div className="flex items-center gap-4 border-t border-white/8 px-4 py-2.5 text-[11px] text-slate-500">
          <span>
            <kbd className="font-mono text-slate-400">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="font-mono text-slate-400">↵</kbd> open
          </span>
          <span>
            <kbd className="font-mono text-slate-400">esc</kbd> close
          </span>
          <span className="ml-auto sb-mono-label text-slate-600">skillbridge cmd</span>
        </div>
      </div>
    </div>
  )
}
