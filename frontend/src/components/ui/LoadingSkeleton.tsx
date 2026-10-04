import { motion, useReducedMotion } from 'framer-motion'

import { ease } from '../../motion/tokens'

interface SkeletonProps {
  className?: string
}

/**
 * Shimmer skeleton.
 *
 * A single soft gradient sweep across each block: translate-only, runs on the
 * compositor, and stops after 8 sweeps so the page does not keep animating
 * while a fetch stalls. Under reduced motion the gradient is still rendered,
 * but stationary, so the loading state remains legible without movement.
 */
function ShimmerBlock({ className = '' }: SkeletonProps) {
  const reduced = useReducedMotion()

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-white/6 ${className}`}
      aria-hidden="true"
    >
      {!reduced && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(129,140,248,0.18) 50%, transparent 100%)',
          }}
          initial={{ x: '-120%' }}
          animate={{ x: '220%' }}
          transition={{ duration: 1.6, ease: ease.out, repeat: 7, repeatType: 'loop' }}
        />
      )}
    </div>
  )
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <ShimmerBlock className={className} />
}

/** Generic block used while a page's primary content loads. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="sb-glass space-y-3 rounded-2xl p-5"
    >
      <ShimmerBlock className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, index) => (
        <ShimmerBlock key={index} className={index % 2 ? 'h-3 w-4/5' : 'h-3 w-full'} />
      ))}
    </motion.div>
  )
}

/** Grid of cards - for opportunity and assessment listings. */
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ delay: Math.min(index, 4) * 0.06, duration: 0.22, ease: ease.out }}
          className="sb-glass space-y-3 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3">
            <ShimmerBlock className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <ShimmerBlock className="h-3.5 w-2/3" />
              <ShimmerBlock className="h-3 w-1/3" />
            </div>
          </div>
          <ShimmerBlock className="h-2 w-full" />
          <div className="flex gap-2">
            <ShimmerBlock className="h-6 w-20 rounded-full" />
            <ShimmerBlock className="h-6 w-16 rounded-full" />
            <ShimmerBlock className="h-6 w-24 rounded-full" />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/** Stat row used at the top of the dashboard and progress pages. */
export function SkeletonMetrics({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06, duration: 0.24, ease: ease.out }}
          className="sb-glass space-y-3 rounded-2xl p-4"
        >
          <ShimmerBlock className="h-3 w-24" />
          <ShimmerBlock className="h-7 w-16" />
          <ShimmerBlock className="h-2.5 w-28" />
        </motion.div>
      ))}
    </div>
  )
}
