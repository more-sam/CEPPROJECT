import { motion, useReducedMotion } from 'framer-motion'
import { useId, type SVGProps } from 'react'

/**
 * Props framer-motion replaces on `motion.svg` are omitted from the SVG prop
 * set before the spread. React's handlers and SVG attributes share names with
 * framer's own (`onAnimationStart` vs its `AnimationDefinition` callback,
 * `values` vs its map of MotionValues), which makes a plain
 * `extends SVGProps<SVGSVGElement>` a type error on every `motion.svg` site.
 */
type SkillBridgeLogoProps = Omit<
  SVGProps<SVGSVGElement>,
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onDragStart'
  | 'onDrag'
  | 'onDragEnd'
  | 'onDragEnter'
  | 'onDragLeave'
  | 'onDragOver'
  | 'onDrop'
  | 'values'
> & {
  size?: number
  variant?: 'full' | 'icon' | 'compact' | 'monochrome' | 'dark' | 'light' | 'favicon'
  full?: boolean
  animated?: boolean
  animate?: boolean
  aiActive?: boolean
}

export function SkillBridgeLogo({
  size = 32,
  variant = 'full',
  full,
  animated = true,
  animate,
  aiActive = false,
  className,
  ...rest
}: SkillBridgeLogoProps) {
  const reduced = useReducedMotion()
  const unique = useId().replace(/:/g, '')
  const gradId = `sb-grad-${unique}`
  const glowId = `sb-glow-${unique}`

  const isAnimated = animate ?? animated
  const resolved = full === false ? 'icon' : variant
  const shouldAnimate = isAnimated && !reduced && !aiActive

  const defs = (
    <defs>
      <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#22D3EE" />
      </linearGradient>
      {aiActive && (
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      )}
    </defs>
  )

  if (resolved === 'monochrome' || resolved === 'dark' || resolved === 'light') {
    return (
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        style={{ color: 'currentColor', ...rest.style }}
        className={className}
        {...rest}
      >
        <g transform="translate(4, 4) scale(0.8)">
          <path d="M 32 10 L 22 10 C 16 10, 12 14, 12 20 C 12 26, 16 30, 22 30 L 38 30" stroke="currentColor" strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter" fill="none" />
          <path d="M 16 38 L 26 38 C 32 38, 36 34, 36 28 C 36 22, 32 18, 26 18 L 10 18" stroke="currentColor" strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter" fill="none" />
          <circle cx="32" cy="10" r="3" fill="currentColor" />
          <circle cx="16" cy="38" r="3" fill="currentColor" />
        </g>
      </motion.svg>
    )
  }
  if (resolved === 'icon' || resolved === 'favicon') {
    return (
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        initial={shouldAnimate ? 'hidden' : false}
        animate={aiActive ? 'ai' : shouldAnimate ? 'visible' : false}
        whileHover={!reduced && !aiActive ? 'hover' : undefined}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } },
          hover: { scale: 1.05 },
          ai: {}
        }}
        className={className}
        {...rest}
      >
        {defs}
        <g transform="translate(4, 4) scale(0.8)">
          <motion.path d="M 32 10 L 22 10 C 16 10, 12 14, 12 20 C 12 26, 16 30, 22 30 L 38 30" stroke={`url(#${gradId})`} strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter" fill="none" variants={{ hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } }, ai: { opacity: [0.8, 1, 0.8], transition: { duration: 1.2, repeat: Infinity } } }} />
          <motion.path d="M 16 38 L 26 38 C 32 38, 36 34, 36 28 C 36 22, 32 18, 26 18 L 10 18" stroke={`url(#${gradId})`} strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter" fill="none" variants={{ hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1, transition: { duration: 0.6, delay: 0.2, ease: 'easeOut' } }, ai: { opacity: [0.8, 1, 0.8], transition: { duration: 1.2, delay: 0.3, repeat: Infinity } } }} />
          <motion.circle cx="32" cy="10" r="3" fill="#22D3EE" variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: { delay: 0.5, type: 'spring' } } }} />
          <motion.circle cx="16" cy="38" r="3" fill="#3B82F6" variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: { delay: 0.7, type: 'spring' } } }} />
        </g>
      </motion.svg>
    )
  }
  
  if (resolved === 'compact') {
    const w = size * 5.2
    const h = size
    return (
      <motion.svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        fill="none"
        aria-label="SkillBridge AI"
        style={{ display: 'block', flexShrink: 0 }}
        initial={shouldAnimate ? 'hidden' : false}
        animate={aiActive ? 'ai' : shouldAnimate ? 'visible' : false}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } }
        }}
        {...rest}
      >
        {defs}
        <g transform={`scale(${size / 48})`}>
          <g transform="translate(4, 4) scale(0.8)">
            <motion.path d="M 32 10 L 22 10 C 16 10, 12 14, 12 20 C 12 26, 16 30, 22 30 L 38 30" stroke={`url(#${gradId})`} strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter" fill="none" variants={{ hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } }, ai: { opacity: [0.8, 1, 0.8], transition: { duration: 1.2, repeat: Infinity } } }} />
            <motion.path d="M 16 38 L 26 38 C 32 38, 36 34, 36 28 C 36 22, 32 18, 26 18 L 10 18" stroke={`url(#${gradId})`} strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter" fill="none" variants={{ hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1, transition: { duration: 0.6, delay: 0.2, ease: 'easeOut' } }, ai: { opacity: [0.8, 1, 0.8], transition: { duration: 1.2, delay: 0.3, repeat: Infinity } } }} />
            <motion.circle cx="32" cy="10" r="3" fill="#22D3EE" variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: { delay: 0.5, type: 'spring' } } }} />
            <motion.circle cx="16" cy="38" r="3" fill="#3B82F6" variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: { delay: 0.7, type: 'spring' } } }} />
          </g>
        </g>
        <motion.text 
          x={size * 1.3} 
          y={h * 0.65} 
          fill="#F8FAFC" 
          fontSize={size * 0.7} 
          fontWeight={600} 
          fontFamily="var(--font-display,'Space Grotesk','Inter',system-ui,sans-serif)"
          variants={{
            hidden: { opacity: 0, x: -10 },
            visible: { opacity: 1, x: 0, transition: { duration: 0.4, delay: 0.4 } }
          }}
        >
          SkillBridge
        </motion.text>
        <motion.text 
          x={size * 1.3 + (size * 0.7 * 4.4)} 
          y={h * 0.65} 
          fill="#22D3EE" 
          fontSize={size * 0.4} 
          fontWeight={600} 
          fontFamily="var(--font-display,'Space Grotesk','Inter',system-ui,sans-serif)"
          variants={{
            hidden: { opacity: 0, x: -10 },
            visible: { opacity: 1, x: 0, transition: { duration: 0.4, delay: 0.6 } }
          }}
        >
          AI
        </motion.text>
      </motion.svg>
    )
  }

  // Full / Default Variant (desktop navbar)
  const fw = size * 6
  const fh = size
  return (
    <motion.svg
      width={fw}
      height={fh}
      viewBox={`0 0 ${fw} ${fh}`}
      fill="none"
      aria-label="SkillBridge AI"
      style={{ display: 'block', flexShrink: 0 }}
      initial={shouldAnimate ? 'hidden' : false}
      animate={aiActive ? 'ai' : shouldAnimate ? 'visible' : false}
      whileHover={!reduced && !aiActive ? 'hover' : undefined}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } },
        hover: { scale: 1.02 }
      }}
      {...rest}
    >
      {defs}
      <g transform={`scale(${size / 48})`}>
        <g transform="translate(4, 4) scale(0.8)">
          <motion.path d="M 32 10 L 22 10 C 16 10, 12 14, 12 20 C 12 26, 16 30, 22 30 L 38 30" stroke={`url(#${gradId})`} strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter" fill="none" variants={{ hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } }, ai: { opacity: [0.8, 1, 0.8], transition: { duration: 1.2, repeat: Infinity } } }} />
          <motion.path d="M 16 38 L 26 38 C 32 38, 36 34, 36 28 C 36 22, 32 18, 26 18 L 10 18" stroke={`url(#${gradId})`} strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter" fill="none" variants={{ hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1, transition: { duration: 0.6, delay: 0.2, ease: 'easeOut' } }, ai: { opacity: [0.8, 1, 0.8], transition: { duration: 1.2, delay: 0.3, repeat: Infinity } } }} />
          <motion.circle cx="32" cy="10" r="3" fill="#22D3EE" variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: { delay: 0.5, type: 'spring' } } }} />
          <motion.circle cx="16" cy="38" r="3" fill="#3B82F6" variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: { delay: 0.7, type: 'spring' } } }} />
        </g>
      </g>
      <motion.text 
        x={size * 1.25} 
        y={fh * 0.65} 
        fill="#F8FAFC" 
        fontSize={size * 0.7} 
        fontWeight={600} 
        letterSpacing="0.01em" 
        fontFamily="var(--font-display,'Space Grotesk','Inter',system-ui,sans-serif)"
        variants={{
          hidden: { opacity: 0, y: 4 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.4 } }
        }}
      >
        SkillBridge
      </motion.text>
      <motion.text 
        x={size * 1.25 + (size * 0.7 * 4.4)} 
        y={fh * 0.65} 
        fill="#22D3EE" 
        fontSize={size * 0.4} 
        fontWeight={700} 
        letterSpacing="0.02em" 
        fontFamily="var(--font-display,'Space Grotesk','Inter',system-ui,sans-serif)"
        variants={{
          hidden: { opacity: 0, y: 4 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.5 } }
        }}
      >
        AI
      </motion.text>
    </motion.svg>
  )
}
