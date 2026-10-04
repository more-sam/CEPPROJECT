import { motion, useMotionValue, useReducedMotion, useSpring, type MotionValue } from 'framer-motion'
import { useEffect } from 'react'

import { useHasFinePointer } from './usePrefersReducedMotion'

/**
 * Cursor-following ambient light.
 *
 * Two concentric pools of brand colour that trail the pointer with a spring, so
 * the page reads as lit by whatever the visitor is pointing at rather than by a
 * hard-coded glow. Deliberately dim and very large: it should be felt, not seen.
 *
 * Everything runs through motion values and springs, so pointer movement never
 * triggers a React render. Under reduced motion, or on touch devices where there
 * is no cursor, nothing is rendered at all.
 */
export function CursorGlow() {
  const reduced = useReducedMotion()
  const finePointer = useHasFinePointer()

  const x = useMotionValue(-600)
  const y = useMotionValue(-600)

  // A soft trailing spring: fast enough to feel attached, slow enough that the
  // light reads as having mass.
  const coreX = useSpring(x, { stiffness: 140, damping: 26, mass: 0.9 })
  const coreY = useSpring(y, { stiffness: 140, damping: 26, mass: 0.9 })
  // The highlight lags further behind the core, which gives the light depth.
  const glowX = useSpring(coreX, { stiffness: 70, damping: 18, mass: 1.1 })
  const glowY = useSpring(coreY, { stiffness: 70, damping: 18, mass: 1.1 })

  useEffect(() => {
    if (reduced || !finePointer) return

    const onMove = (event: PointerEvent) => {
      // Touch reports pointer events too; a light that follows a finger reads
      // as a bug, so those are ignored.
      if (event.pointerType === 'touch') return
      x.set(event.clientX)
      y.set(event.clientY)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [reduced, finePointer, x, y])

  if (reduced || !finePointer) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Wide, very soft core. */}
      <motion.div
        className="absolute h-[540px] w-[540px] rounded-full"
        style={{
          x: coreX,
          y: coreY,
          translateX: '-50%',
          translateY: '-50%',
          background:
            'radial-gradient(circle, rgba(99,102,241,0.14) 0%, rgba(99,102,241,0.05) 38%, transparent 70%)',
          filter: 'blur(14px)',
        }}
      />
      {/* Tighter, slower highlight. */}
      <motion.div
        className="absolute h-[190px] w-[190px] rounded-full"
        style={{
          x: glowX,
          y: glowY,
          translateX: '-50%',
          translateY: '-50%',
          background: 'radial-gradient(circle, rgba(34,211,238,0.11) 0%, transparent 68%)',
          filter: 'blur(20px)',
        }}
      />
    </div>
  )
}

/** Re-exported type so callers can hold a pointer-driven motion value. */
export type PointerValue = MotionValue<number>
