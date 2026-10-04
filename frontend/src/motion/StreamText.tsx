import { useEffect, useRef, useState } from 'react'

import { usePrefersReducedMotion } from './usePrefersReducedMotion'

export interface StreamTextProps {
  text: string
  /** Average milliseconds per character. */
  speed?: number
  className?: string
  /** Notified once the whole string has been revealed. */
  onDone?: () => void
  /** Render a blinking caret while streaming. */
  caret?: boolean
}

/**
 * Streaming text.
 *
 * AI answers and long status messages read as instant data dumps when they
 * appear whole. Revealing them at a variable rate - slower on punctuation, a
 * beat on newlines - makes the text feel like it is being composed, which is
 * the whole point of a conversational surface.
 *
 * The reveal is driven by an interval rather than one rAF per character so a
 * 2,000-character answer costs a few dozen ticks, not two thousand renders.
 * Under reduced motion the full text renders immediately with no caret.
 */
export function StreamText({
  text,
  speed = 14,
  className = '',
  onDone,
  caret = true,
}: StreamTextProps) {
  const reduced = usePrefersReducedMotion()
  const [visible, setVisible] = useState(reduced ? text.length : 0)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    if (reduced) {
      setVisible(text.length)
      return undefined
    }

    // Restart cleanly when a new answer replaces the old one.
    setVisible(0)
    if (text.length === 0) return undefined

    let index = 0
    const tick = () => {
      index += 1
      setVisible(index)

      if (index >= text.length) {
        doneRef.current?.()
        return
      }

      const char = text[index] ?? ''
      // Pause a beat on characters that imply a break in speech.
      const delay =
        char === '\n' ? speed * 6 : char === '.' || char === '?' || char === '!' ? speed * 5 : char === ',' ? speed * 3 : speed

      timer = window.setTimeout(tick, delay)
    }

    let timer = window.setTimeout(tick, speed)
    return () => window.clearTimeout(timer)
  }, [text, speed, reduced])

  if (reduced) {
    return <span className={className}>{text}</span>
  }

  const complete = visible >= text.length

  return (
    <span className={className}>
      {text.slice(0, visible)}
      {caret && !complete && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-brand-400 align-baseline"
        >
          <span className="block h-full w-full animate-pulse" />
        </span>
      )}
    </span>
  )
}
