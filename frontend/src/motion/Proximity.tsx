import { useReducedMotion } from 'framer-motion'
import { useCallback, useRef, type ReactNode } from 'react'

import { useHasFinePointer } from './usePrefersReducedMotion'

/**
 * Writes pointer position into CSS custom properties on an element.
 *
 * Pointer tracking happens entirely on the DOM node: no state, no renders, no
 * layout reads beyond a single `getBoundingClientRect` per move (which the
 * browser serves from its own cache). This is what makes it affordable to put
 * proximity light on every card in a grid.
 */
export function usePointerVars<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const frame = useRef(0)
  const latest = useRef({ x: 0, y: 0 })

  const onPointerMove = useCallback((event: React.PointerEvent<T>) => {
    const node = ref.current
    if (!node || event.pointerType === 'touch') return

    latest.current = { x: event.clientX, y: event.clientY }

    // Coalesce to one measurement per frame so a 1000Hz mouse cannot flood
    // getBoundingClientRect.
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      const target = ref.current
      if (!target) return
      const bounds = target.getBoundingClientRect()
      target.style.setProperty('--sb-cursor-x', `${latest.current.x - bounds.left}px`)
      target.style.setProperty('--sb-cursor-y', `${latest.current.y - bounds.top}px`)
    })
  }, [])

  return { ref, onPointerMove }
}

/**
 * Adds cursor-proximity lighting to a panel.
 *
 * The visible effect lives entirely in CSS (`.sb-proximity::before` is a masked
 * radial gradient); this component only supplies the coordinates. That keeps the
 * glow on the compositor and means a card with fifty proximity areas on screen
 * still costs no JavaScript per frame.
 */
export function Proximity({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const reduced = useReducedMotion()
  const finePointer = useHasFinePointer()
  const { ref, onPointerMove } = usePointerVars<HTMLDivElement>()

  if (reduced || !finePointer) {
    return <div className={className}>{children}</div>
  }

  return (
    <div ref={ref} onPointerMove={onPointerMove} className={`sb-proximity ${className}`}>
      {children}
    </div>
  )
}
