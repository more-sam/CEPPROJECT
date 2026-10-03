import type { SVGProps } from 'react'

/**
 * SkillBridge AI logo.
 *
 * A geometric bridge/network symbol combining:
 * - Skill connections (nodes + edges)
 * - Career pathway (upward progression)
 * - AI network (central hub)
 * - Subtle "S" geometry
 *
 * The mark visually communicates:
 * STUDENT SKILLS → AI → CAREER OPPORTUNITIES
 */

interface SkillBridgeLogoProps extends SVGProps<SVGSVGElement> {
  /** Total width in pixels. Height is computed to keep aspect ratio. */
  size?: number
  /**
   * When true, render the compact favicon-only mark (no wordmark).
   * Used by the browser tab icon.
   */
  favicon?: boolean
  /** When true, render icon + wordmark side by side (default). */
  full?: boolean
}

export function SkillBridgeLogo({
  size = 128,
  favicon = false,
  full = true,
  ...rest
}: SkillBridgeLogoProps) {
  const width = size
  const height = Math.round(size * (favicon ? 1 : 1.2))

  if (favicon) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 120 120"
        aria-hidden="true"
        focusable={false}
        {...rest}
      >
        <defs>
          <linearGradient id="sb-mark-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
        <rect width={size} height={size} fill="none" />
        <g transform="translate(10, 10) scale(0.8333)">
          {/* Network nodes - skills */}
          <circle cx={25} cy={85} r={6} fill="url(#sb-mark-gradient)" opacity="0.9" />
          <circle cx={50} cy={35} r={6} fill="url(#sb-mark-gradient)" opacity="0.9" />
          <circle cx={75} cy={85} r={6} fill="url(#sb-mark-gradient)" opacity="0.9" />
          <circle cx={95} cy={35} r={6} fill="url(#sb-mark-gradient)" opacity="0.9" />
          
          {/* Central AI hub */}
          <circle cx={60} cy={60} r={10} fill="url(#sb-mark-gradient)" />
          
          {/* Connections - skill pathways */}
          <path
            d="M31 79 L50 50 M70 79 L50 50 M50 45 L50 50"
            stroke="url(#sb-mark-gradient)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.6"
          />
          
          {/* Upward progression arrow */}
          <path
            d="M60 50 L60 20"
            stroke="url(#sb-mark-gradient)"
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
          />
          <path
            d="M50 30 L60 20 L70 30"
            stroke="url(#sb-mark-gradient)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.7"
          />
          
          {/* Subtle "S" geometry in negative space */}
          <path
            d="M40 60 Q50 45 60 60 Q70 75 80 60"
            stroke="url(#sb-mark-gradient)"
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
            opacity="0.3"
          />
        </g>
      </svg>
    )
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flexShrink: 0 }}
      {...rest}
    >
      <defs>
        <linearGradient id="sb-mark-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
        <linearGradient id="sb-text-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </linearGradient>
      </defs>

      {full ? (
        <>
          {/* Brand mark — the bridge/network on the left */}
          <g transform={`translate(0, ${(height - 80) / 2})`}>
            {/* Network nodes - skills */}
            <circle cx={20} cy={68} r={5} fill="url(#sb-mark-gradient)" opacity="0.9" />
            <circle cx={40} cy={28} r={5} fill="url(#sb-mark-gradient)" opacity="0.9" />
            <circle cx={60} cy={68} r={5} fill="url(#sb-mark-gradient)" opacity="0.9" />
            <circle cx={80} cy={28} r={5} fill="url(#sb-mark-gradient)" opacity="0.9" />
            
            {/* Central AI hub */}
            <circle cx={48} cy={48} r={8} fill="url(#sb-mark-gradient)" />
            
            {/* Connections - skill pathways */}
            <path
              d="M25 63 L40 40 M55 63 L40 40 M40 36 L40 40"
              stroke="url(#sb-mark-gradient)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.6"
            />
            
            {/* Upward progression arrow */}
            <path
              d="M48 40 L48 16"
              stroke="url(#sb-mark-gradient)"
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
              opacity="0.7"
            />
            <path
              d="M40 26 L48 16 L56 26"
              stroke="url(#sb-mark-gradient)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.7"
            />
            
            {/* Subtle "S" geometry in negative space */}
            <path
              d="M32 48 Q40 36 48 48 Q56 60 64 48"
              stroke="url(#sb-mark-gradient)"
              strokeWidth={1.5}
              strokeLinecap="round"
              fill="none"
              opacity="0.3"
            />
          </g>

          {/* Wordmark */}
          <g transform={`translate(100, ${height * 0.28})`}>
            <text
              x={0}
              y={0}
              fill="url(#sb-text-gradient)"
              fontSize={width * 0.13}
              fontWeight={600}
              letterSpacing={width * 0.002}
              fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, 'Noto Sans', sans-serif"
            >
              SkillBridge
            </text>
            <text
              x={0}
              y={width * 0.18}
              fill="#7dd3fc"
              fontSize={width * 0.082}
              fontWeight={600}
              letterSpacing={width * 0.006}
              fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, 'Noto Sans', sans-serif"
            >
              AI
            </text>
          </g>
        </>
      ) : (
        /* Icon-only variant */
        <g transform={`translate(${width * 0.1}, ${(height - 80) / 2}) scale(1.25)`}>
          {/* Network nodes - skills */}
          <circle cx={20} cy={68} r={5} fill="url(#sb-mark-gradient)" opacity="0.9" />
          <circle cx={40} cy={28} r={5} fill="url(#sb-mark-gradient)" opacity="0.9" />
          <circle cx={60} cy={68} r={5} fill="url(#sb-mark-gradient)" opacity="0.9" />
          <circle cx={80} cy={28} r={5} fill="url(#sb-mark-gradient)" opacity="0.9" />
          
          {/* Central AI hub */}
          <circle cx={48} cy={48} r={8} fill="url(#sb-mark-gradient)" />
          
          {/* Connections - skill pathways */}
          <path
            d="M25 63 L40 40 M55 63 L40 40 M40 36 L40 40"
            stroke="url(#sb-mark-gradient)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.6"
          />
          
          {/* Upward progression arrow */}
          <path
            d="M48 40 L48 16"
            stroke="url(#sb-mark-gradient)"
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
          />
          <path
            d="M40 26 L48 16 L56 26"
            stroke="url(#sb-mark-gradient)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.7"
          />
          
          {/* Subtle "S" geometry */}
          <path
            d="M32 48 Q40 36 48 48 Q56 60 64 48"
            stroke="url(#sb-mark-gradient)"
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
            opacity="0.3"
          />
        </g>
      )}
    </svg>
  )
}

/**
 * Tiny favicon-only variant (browser tab icon).
 */
export function SkillBridgeFavicon() {
  return <SkillBridgeLogo size={32} favicon />
}