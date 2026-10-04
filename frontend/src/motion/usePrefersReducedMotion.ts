import { useEffect, useState } from 'react'

/**
 * `prefers-reduced-motion` as React state.
 *
 * Subscribes to the media query rather than reading it once, so toggling the
 * OS setting takes effect without a reload. Every JS-driven animation in the
 * app (particles, physics, parallax, text streaming, cursor light) gates on
 * this: when reduced, they are not rendered at all rather than merely shortened,
 * because a fast particle field is still a particle field.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', onChange)
    // Re-sync in case the setting changed between first render and this effect.
    setReduced(query.matches)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/**
 * True when a fine pointer is available. Touch devices get no cursor effects at
 * all - a "cursor-following" light that follows a finger reads as a bug.
 */
export function useHasFinePointer(): boolean {
  const [fine, setFine] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
  })

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)')
    const onChange = (event: MediaQueryListEvent) => setFine(event.matches)
    query.addEventListener('change', onChange)
    setFine(query.matches)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return fine
}

/** True while the tab is visible - used to pause rAF loops when hidden. */
export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(() =>
    typeof document === 'undefined' ? true : !document.hidden,
  )

  useEffect(() => {
    const onChange = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  return visible
}
