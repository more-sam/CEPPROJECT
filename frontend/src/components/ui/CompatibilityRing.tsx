import { motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'

import { duration, ease } from '../../motion/tokens'
import { useCountUp } from '../../hooks/useCountUp'

interface CompatibilityRingProps {
  /** 0-100, or null when the visitor is anonymous / has no skills yet. */
  value: number | null
  size?: number
  strokeWidth?: number
  label?: string
  /** Hide the small caption under the number. */
  compact?: boolean
}

/** Colour banding keeps the indicator interpretable at a glance. */
export function scoreTone(value: number): {
  stroke: string
  text: string
  band: 'strong' | 'good' | 'partial' | 'low'
  caption: string
} {
  if (value >= 70) {
    return { stroke: '#34d399', text: 'text-emerald-300', band: 'strong', caption: 'Strong alignment' }
  }
  if (value >= 50) {
    return { stroke: '#22d3ee', text: 'text-aqua-400', band: 'good', caption: 'Good alignment' }
  }
  if (value >= 25) {
    return { stroke: '#fbbf24', text: 'text-amber-300', band: 'partial', caption: 'Partial alignment' }
  }
  return { stroke: '#fb7185', text: 'text-rose-300', band: 'low', caption: 'Early alignment' }
}

/**
 * Signature visual #2 (spec §21): SkillBridge Compatibility.
 *
 * The ring draws itself on mount with a pathLength animation while the number
 * counts up in lock-step. The band colour is driven from the final value, not
 * the animated one, so the colour never flickers through intermediate bands
 * while counting.
 */
export function CompatibilityRing({
  value,
  size = 132,
  strokeWidth = 10,
  label = 'SkillBridge Compatibility',
  compact = false,
}: CompatibilityRingProps) {
  const motionValue = useMotionValue(0)
  const reduced = useReducedMotion()
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const nullState = value === null

  useEffect(() => {
    if (nullState) {
      motionValue.set(0)
      return
    }
    const clamped = Math.max(0, Math.min(100, value))
    if (reduced) {
      motionValue.jump(clamped)
    } else {
      motionValue.set(clamped)
    }
  }, [value, reduced, nullState, motionValue])

  if (nullState) {
    return (
      <div className="flex flex-col items-center gap-1.5" style={{ width: size }}>
        <motion.div
          className="grid place-items-center rounded-full border border-dashed border-white/15"
          style={{ width: size, height: size }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: duration.fast, ease: ease.out }}
        >
          <span className="text-xs text-slate-500">No score yet</span>
        </motion.div>
        {!compact && <span className="text-[11px] text-slate-500">{label}</span>}
      </div>
    )
  }

  const clamped = Math.max(0, Math.min(100, value))
  const tone = scoreTone(clamped)
  const dash = (clamped / 100) * circumference

  // The displayed number counts in lock-step with the ring. Under reduced
  // motion `useCountUp` jumps directly; here we mirror that rather than
  // animating through every intermediate integer.
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative grid place-items-center"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${label}: ${clamped.toFixed(0)} percent`}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={tone.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            initial={{ strokeDashoffset: 0, pathLength: 0 }}
            animate={{ pathLength: clamped / 100 }}
            transition={{ duration: duration.viz, ease: ease.out }}
            style={{
              filter: `drop-shadow(0 0 6px ${tone.stroke}66)`,
              // Tie the spring to the dash length so the ring draw and the
              // glow arrive together.
              // `motionValue` is set via effect; framer drives `pathLength`
              // directly, so no manual style mapping is needed here.
              // Keeping the transition in one place avoids double-spring jitter.
              ...(reduced ? { strokeDasharray: `${dash} ${circumference}` } : {}),
            }}
          />
        </svg>

        <div className="absolute flex flex-col items-center">
          <CountLabel value={clamped} tone={tone.text} reduced={Boolean(reduced)} />
          {!compact && <span className="text-[10px] text-slate-500">{tone.caption}</span>}
        </div>
      </div>
      {!compact && (
        <motion.span
          className="text-center text-[11px] font-medium text-slate-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduced ? 0 : duration.viz, duration: duration.fast, ease: ease.out }}
        >
          {label}
        </motion.span>
      )}
    </div>
  )
}

function CountLabel({
  value,
  tone,
  reduced,
}: {
  value: number
  tone: string
  reduced: boolean
}) {
  const animated = useCountUp(value, reduced ? 0 : duration.viz * 1000)

  if (reduced) {
    return (
      <span className={`font-display text-2xl font-semibold ${tone}`}>
        {value.toFixed(value % 1 === 0 ? 0 : 1)}
        <span className="text-sm">%</span>
      </span>
    )
  }

  const clamped = Math.max(0, Math.min(100, value))
  const display = animated.toFixed(clamped % 1 === 0 ? 0 : 1)

  return (
    <motion.span
      className={`font-display text-2xl font-semibold tabular-nums ${tone}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16, ease: ease.out }}
    >
      {display}
      <span className="text-sm">%</span>
    </motion.span>
  )
}
