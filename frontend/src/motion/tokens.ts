/**
 * Motion tokens - one scale for the whole product.
 *
 * Durations follow a deliberate ladder so the app reads as one system:
 *
 *   micro   120-200ms   hover, press, tooltip, toggle
 *   normal  200-350ms   panels, dropdowns, list reflow
 *   page    250-450ms   route transitions
 *   viz     500-1000ms  graphs, rings, path drawing
 *
 * Easing is deliberately narrow: one expo-out family for anything that enters
 * or settles, one in-out for anything that moves between two states, one spring
 * for direct manipulation (drag, press, node physics).
 */

export const duration = {
  micro: 0.16,
  fast: 0.22,
  normal: 0.28,
  page: 0.34,
  viz: 0.82,
  hero: 1,
} as const

/** CSS-ready strings for the same scale (inline styles / Web Animations). */
export const cssDuration = {
  micro: '160ms',
  fast: '220ms',
  normal: '280ms',
  page: '340ms',
  viz: '820ms',
  hero: '1000ms',
} as const

export const ease = {
  /** Default for anything entering or settling. */
  out: [0.22, 1, 0.36, 1] as [number, number, number, number],
  /** For a value moving between two states. */
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
  /** Direct manipulation only: press, drag, physics. */
  spring: [0.34, 1.42, 0.64, 1] as [number, number, number, number],
} as const

/** The five transitions that cover the entire app. */
export const transition = {
  micro: { duration: duration.micro, ease: ease.out },
  fast: { duration: duration.fast, ease: ease.out },
  normal: { duration: duration.normal, ease: ease.out },
  page: { duration: duration.page, ease: ease.out },
  viz: { duration: duration.viz, ease: ease.out },
  spring: { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 },
} as const

/**
 * Distance an element travels when it enters. Small on purpose: a page
 * transition should feel like a change of page, not a flight.
 */
export const enterDistance = 14

/** Shared variants: a parent runs `staggerChildren`, children run `rise`. */
export const riseVariants = {
  hidden: { opacity: 0, y: enterDistance },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: ease.out },
  },
} as const

export const staggerContainer = (stagger = 0.07, delayChildren = 0) => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
})

/** Fades without the lift - for dense text blocks where movement is noise. */
export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.fast, ease: ease.out },
  },
} as const
