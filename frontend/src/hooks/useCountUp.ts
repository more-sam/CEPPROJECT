import { useEffect, useRef, useState } from 'react'

/** Read once per call; the OS setting rarely flips mid-session. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Animate a number from 0 (or its previous value) to `target`.
 *
 * Used for metric cards and the landing stats band so counters roll up when
 * they appear instead of popping in. With prefers-reduced-motion the target is
 * returned directly during render - no animation and no effect.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0)
  const previousRef = useRef(0)
  const reduced = prefersReducedMotion()

  useEffect(() => {
    if (!Number.isFinite(target)) return

    if (reduced || durationMs <= 0) {
      previousRef.current = target
      return
    }

    const from = previousRef.current
    const delta = target - from
    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1)
      // ease-out cubic: fast start, gentle landing
      const eased = 1 - Math.pow(1 - progress, 3)
      // setState inside rAF: asynchronous by construction.
      setValue(from + delta * eased)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        previousRef.current = target
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs, reduced])

  // Render-time derivation for the reduced-motion path (and the initial frame).
  if (reduced || durationMs <= 0) return Number.isFinite(target) ? target : value
  return value
}
