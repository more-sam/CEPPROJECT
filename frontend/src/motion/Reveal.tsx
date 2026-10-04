import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { duration, ease, enterDistance } from './tokens'

/**
 * Scroll reveal, built directly on IntersectionObserver.
 *
 * One observer per group rather than one global observer: in a long opportunity
 * list each block should reveal when *it* reaches the fold, not when the
 * section header did. Observation is one-shot by default, because re-animating
 * content the user has already read is noise.
 */
export function useInViewOnce<T extends HTMLElement>(
  options: { amount?: number; margin?: string; once?: boolean } = {},
) {
  const { amount = 0.2, margin = '0px 0px -12% 0px', once = true } = options
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // No IntersectionObserver (very old browsers, or a DOM test environment):
    // render immediately instead of hiding content that would never appear.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true)
            if (once) observer.disconnect()
          } else if (!once) {
            setInView(false)
          }
        }
      },
      { threshold: amount, rootMargin: margin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [amount, margin, once])

  return { ref, inView }
}

const MOTION_TAGS = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  li: motion.li,
  span: motion.span,
  header: motion.header,
  footer: motion.footer,
  ol: motion.ol,
  ul: motion.ul,
} as const

export interface RevealProps {
  children?: ReactNode
  className?: string
  /** Seconds to wait before this block animates (used for manual cascades). */
  delay?: number
  /** Travel distance in px. */
  distance?: number
  /** IntersectionObserver threshold. */
  amount?: number
  /** Fade only - for dense text blocks where movement is noise. */
  fadeOnly?: boolean
  as?: keyof typeof MOTION_TAGS
  style?: React.CSSProperties
}

/**
 * A block that fades and lifts into place the first time it is scrolled to.
 *
 * Under reduced motion the transform is dropped entirely and only a brief
 * opacity fade remains, so the change still reads as intentional.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  distance = enterDistance,
  amount = 0.2,
  fadeOnly = false,
  as = 'div',
  style,
}: RevealProps) {
  const reduced = useReducedMotion()
  const { ref, inView } = useInViewOnce<HTMLDivElement>({ amount })
  const Component = MOTION_TAGS[as]

  const hidden = fadeOnly
    ? { opacity: 0 }
    : { opacity: 0, y: reduced ? 0 : distance }

  return (
    <Component
      ref={ref as never}
      className={className}
      style={style}
      initial={hidden}
      animate={inView ? { opacity: 1, y: 0 } : hidden}
      transition={
        reduced
          ? { duration: 0.18, ease: 'linear' }
          : { duration: duration.normal, ease: ease.out, delay }
      }
    >
      {children}
    </Component>
  )
}

export interface StaggerProps {
  children: ReactNode
  /** Seconds between siblings. */
  step?: number
  className?: string
  /** How much of the group must be visible before the cascade starts. */
  amount?: number
  /** Element the group renders as. */
  as?: keyof typeof MOTION_TAGS
  /** Delay before the first child starts, in seconds. */
  lead?: number
}

/**
 * Cascades its `StaggerItem` children in sequence.
 *
 * Animation is driven by variant inheritance rather than wrapper elements, so
 * a `Stagger` can be a grid, a list or a flex row without changing the layout
 * it animates.
 *
 * The step is capped at ten positions: past that, extra delay only makes a page
 * feel slow, so later children share the last step instead of trailing further
 * and further behind.
 */
export function Stagger({
  children,
  step = 0.07,
  className,
  amount = 0.12,
  as = 'div',
  lead = 0,
}: StaggerProps) {
  const reduced = useReducedMotion()
  const { ref, inView } = useInViewOnce<HTMLDivElement>({ amount })
  const Component = MOTION_TAGS[as]

  const variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduced ? 0 : step,
        delayChildren: reduced ? 0 : lead,
      },
    },
  }

  return (
    <Component
      ref={ref as never}
      className={className}
      variants={variants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
    >
      {children}
    </Component>
  )
}

/**
 * One child in a `Stagger`. Under reduced motion the lift is dropped and the
 * child only fades, so the cascade still reads without any movement.
 */
export function StaggerItem({
  children,
  className,
  style,
  as = 'div',
  distance = enterDistance,
  fadeOnly = false,
  whileHover,
  whileTap,
}: {
  children?: ReactNode
  className?: string
  style?: React.CSSProperties
  as?: keyof typeof MOTION_TAGS
  distance?: number
  fadeOnly?: boolean
  whileHover?: import('framer-motion').TargetAndTransition
  whileTap?: import('framer-motion').TargetAndTransition
}) {
  const reduced = useReducedMotion()
  const Component = MOTION_TAGS[as]

  const variants = fadeOnly
    ? {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { duration: reduced ? 0.18 : duration.normal, ease: ease.out },
        },
      }
    : {
        hidden: { opacity: 0, y: reduced ? 0 : distance },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: reduced ? 0.18 : duration.normal, ease: ease.out },
        },
      }

  return (
    <Component
      className={className}
      style={style}
      variants={variants}
      whileHover={whileHover}
      whileTap={whileTap}
    >
      {children}
    </Component>
  )
}
