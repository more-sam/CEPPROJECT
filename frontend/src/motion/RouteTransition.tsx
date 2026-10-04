import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

import { duration, ease, enterDistance } from './tokens'

/**
 * Route transition.
 *
 * Sits inside a shell that renders the current route, so the sidebar and header
 * stay put while only the content area changes.
 *
 * `popLayout` takes the outgoing page out of flow, which means the incoming
 * page enters while the outgoing one leaves and the container height never
 * jumps. Combined with a shorter exit, the whole navigation resolves inside the
 * 250-450ms budget: 340ms in, 220ms out, overlapping.
 *
 * Motion is transform + opacity only, so nothing here triggers a reflow of the
 * page underneath it.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const location = useLocation()
  const reduced = useReducedMotion()

  // The router keeps the scroll position across navigations, which lands a
  // student halfway down a page they have never seen. Reset on every route
  // change; `instant` avoids fighting the smooth-scroll base style.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])

  if (reduced) {
    // Essential state change only: swap immediately, no fade, no travel.
    return <>{children}</>
  }

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={location.pathname}
        variants={{
          initial: {
            opacity: 0,
            y: enterDistance,
            transition: { duration: duration.page, ease: ease.out },
          },
          animate: {
            opacity: 1,
            y: 0,
            transition: { duration: duration.page, ease: ease.out },
          },
          // Exit is quicker than enter: the student is waiting on the new page,
          // not on the old one leaving.
          exit: {
            opacity: 0,
            y: -enterDistance * 0.5,
            transition: { duration: duration.fast, ease: ease.inOut },
          },
        }}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ willChange: 'transform, opacity' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
