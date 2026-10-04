import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { ease } from './tokens'

/**
 * Button press feedback with a light magnetic pull.
 *
 * Press is a 1px settle plus a 0.985 scale in 160ms - fast enough to feel like
 * the surface itself moved. The magnetic pull is capped at 6px and only applies
 * while the pointer is inside, so a button never visibly detaches from its
 * layout or looks like it is escaping. Everything is transform-only.
 */
export function Pressable({
  children,
  className = '',
  strength = 1,
  as = 'button',
}: {
  children: ReactNode
  className?: string
  /** 0 disables the magnetic pull, keeping only the press feedback. */
  strength?: number
  as?: 'button' | 'a' | 'div'
}) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const [pressed, setPressed] = useState(false)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const pullX = useSpring(x, { stiffness: 320, damping: 24, mass: 0.6 })
  const pullY = useSpring(y, { stiffness: 320, damping: 24, mass: 0.6 })

  useEffect(() => {
    if (reduced || strength <= 0) {
      x.set(0)
      y.set(0)
      return undefined
    }

    const node = ref.current
    if (!node) return undefined

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      const bounds = node.getBoundingClientRect()
      const offsetX = event.clientX - (bounds.left + bounds.width / 2)
      const offsetY = event.clientY - (bounds.top + bounds.height / 2)
      // Normalised pull: full pull at the element's own edge, zero at centre.
      x.set((offsetX / (bounds.width / 2)) * 6 * strength)
      y.set((offsetY / (bounds.height / 2)) * 6 * strength)
    }

    const onLeave = () => {
      x.set(0)
      y.set(0)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerout', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerout', onLeave)
    }
  }, [reduced, strength, x, y])

  const Component = motion[as] as typeof motion.button

  return (
    <Component
      // @ts-expect-error - polymorphic ref, identical at runtime.
      ref={ref}
      className={className}
      style={{ x: reduced ? 0 : pullX, y: reduced ? 0 : pullY }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      animate={pressed ? { scale: 0.985 } : { scale: 1 }}
      transition={{ duration: 0.16, ease: ease.out }}
    >
      {children}
    </Component>
  )
}
