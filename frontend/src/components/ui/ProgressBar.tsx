import { motion, useReducedMotion } from 'framer-motion'

import { ease } from '../../motion/tokens'

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  tone?: 'brand' | 'success' | 'aqua'
  showLabel?: boolean
}

const TONES = {
  brand: 'from-brand-500 to-aqua-400',
  success: 'from-emerald-500 to-teal-400',
  aqua: 'from-aqua-500 to-brand-400',
}

/**
 * Tracked progress bar.
 *
 * The fill draws itself from 0% with an ease-out, and a short sheen sweeps
 * along it once. Both run on transform + scaleX rather than width so they
 * stay on the compositor.
 */
export function ProgressBar({
  value,
  max = 100,
  className = '',
  tone = 'brand',
  showLabel = false,
}: ProgressBarProps) {
  const reduced = useReducedMotion()
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8"
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${TONES[tone]}`}
          initial={reduced ? { width: `${percent}%` } : { scaleX: 0, originX: 0 }}
          animate={{ scaleX: percent / 100 }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 0.82, ease: ease.out }
          }
          style={reduced ? undefined : { willChange: 'transform' }}
        />
      </div>

      {showLabel && (
        <motion.span
          className="w-10 shrink-0 text-right font-mono text-xs font-medium text-slate-400 tabular-nums"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.22, duration: 0.22, ease: ease.out }}
        >
          {percent.toFixed(0)}%
        </motion.span>
      )}
    </div>
  )
}
