import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  placeholder?: string
  className?: string
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search',
  className = '',
}: SearchBarProps) {
  return (
    <form
      role="search"
      className={`relative flex-1 ${className}`}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.()
      }}
    >
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-slate-200 placeholder:text-slate-500 focus:border-brand-400/40 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-white/8 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  )
}
