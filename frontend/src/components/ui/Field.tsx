import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

const CONTROL =
  'w-full sb-input'

function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-slate-400">
      {children}
    </label>
  )
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  hint?: string
}

export function TextField({ id, label, hint, className = '', ...rest }: TextFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <input id={id} className={CONTROL} {...rest} />
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  )
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string
  label: string
}

export function TextAreaField({ id, label, className = '', ...rest }: TextAreaFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <textarea id={id} rows={4} className={`${CONTROL} resize-y`} {...rest} />
    </div>
  )
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string
  label: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export function SelectField({
  id,
  label,
  options,
  placeholder,
  className = '',
  ...rest
}: SelectFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <select id={id} className={`${CONTROL} appearance-none bg-ink-850`} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface TagInputProps {
  id: string
  label: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  /** Optional suggestions offered as one-tap chips. */
  suggestions?: string[]
}

/** Free-text list editor for preferred roles and locations. */
export function TagInput({
  id,
  label,
  values,
  onChange,
  placeholder = 'Type and press Enter',
  suggestions = [],
}: TagInputProps) {
  const add = (raw: string) => {
    const text = raw.trim()
    if (!text) return
    if (values.some((value) => value.toLowerCase() === text.toLowerCase())) return
    onChange([...values, text])
  }

  const remove = (target: string) => onChange(values.filter((value) => value !== target))

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        className={CONTROL}
        placeholder={placeholder}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault()
            add(event.currentTarget.value)
            event.currentTarget.value = ''
          }
        }}
      />

      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions
            .filter((item) => !values.some((v) => v.toLowerCase() === item.toLowerCase()))
            .slice(0, 8)
            .map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => add(item)}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-brand-400/30 hover:text-white"
              >
                + {item}
              </button>
            ))}
        </div>
      )}

      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/12 px-2.5 py-1 text-[11px] text-brand-200 ring-1 ring-brand-400/20"
            >
              {value}
              <button
                type="button"
                onClick={() => remove(value)}
                aria-label={`Remove ${value}`}
                className="text-brand-200/70 transition hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
