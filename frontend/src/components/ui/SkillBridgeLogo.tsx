import type { SVGProps } from 'react'

/**
 * SkillBridge AI Logo — Geometric bridge/network symbol
 * 
 * Represents: Skills → Connection → Opportunity
 * Visual language: Technical, geometric, premium
 */

interface SkillBridgeLogoProps extends SVGProps<SVGSVGElement> {
  size?: number
  full?: boolean
}

export function SkillBridgeLogo({ size = 32, full = true, ...rest }: SkillBridgeLogoProps) {
  const iconSize = size
  const width = full ? size * 3.5 : size
  const height = size

  if (!full) {
    return (
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        style={{ display: 'block' }}
        {...rest}
      >
        <defs>
          <linearGradient id="sb-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        
        {/* Skill nodes - four corner nodes representing skills */}
        <circle cx={22} cy={78} r={7} fill="url(#sb-logo-gradient)" opacity="0.9" />
        <circle cx={78} cy={22} r={7} fill="url(#sb-logo-gradient)" opacity="0.9" />
        <circle cx={22} cy={22} r={7} fill="url(#sb-logo-gradient)" opacity="0.9" />
        <circle cx={78} cy={78} r={7} fill="url(#sb-logo-gradient)" opacity="0.9" />
        
        {/* Central AI hub */}
        <circle cx={50} cy={50} r={12} fill="url(#sb-logo-gradient)" />
        
        {/* Connections - skill pathways to AI */}
        <path
          d="M29 71 L42 42 M58 29 L42 42 M29 29 L42 42 M58 58 L42 42"
          stroke="url(#sb-logo-gradient)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.5"
        />
        
        {/* Upward progression arrow */}
        <path
          d="M50 38 L50 18"
          stroke="url(#sb-logo-gradient)"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        <path
          d="M42 26 L50 18 L58 26"
          stroke="url(#sb-logo-gradient)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.7"
        />
        
        {/* Subtle "S" geometry in negative space */}
        <path
          d="M35 50 Q42 35 50 50 Q58 65 65 50"
          stroke="url(#sb-logo-gradient)"
          strokeWidth={1.5}
          strokeLinecap="round"
          fill="none"
          opacity="0.25"
        />
      </svg>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flexShrink: 0 }}
      {...rest}
    >
      <defs>
        <linearGradient id="sb-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="sb-logo-text-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>

      {/* Brand mark */}
      <g transform={`translate(0, ${(height - size) / 2})`}>
        {/* Skill nodes - four corner nodes */}
        <circle cx={18} cy={size * 0.78} r={size * 0.07} fill="url(#sb-logo-gradient)" opacity="0.9" />
        <circle cx={size * 0.78} cy={size * 0.22} r={size * 0.07} fill="url(#sb-logo-gradient)" opacity="0.9" />
        <circle cx={18} cy={size * 0.22} r={size * 0.07} fill="url(#sb-logo-gradient)" opacity="0.9" />
        <circle cx={size * 0.78} cy={size * 0.78} r={size * 0.07} fill="url(#sb-logo-gradient)" opacity="0.9" />
        
        {/* Central AI hub */}
        <circle cx={size * 0.5} cy={size * 0.5} r={size * 0.12} fill="url(#sb-logo-gradient)" />
        
        {/* Connections - skill pathways to AI */}
        <path
          d={`M${18 + size * 0.07} ${size * 0.78 - size * 0.07} L${size * 0.42} ${size * 0.42} M${size * 0.58} ${size * 0.22 + size * 0.07} L${size * 0.42} ${size * 0.42} M${18 + size * 0.07} ${size * 0.22 + size * 0.07} L${size * 0.42} ${size * 0.42} M${size * 0.58} ${size * 0.58} L${size * 0.42} ${size * 0.42}`}
          stroke="url(#sb-logo-gradient)"
          strokeWidth={size * 0.025}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.5"
        />
        
        {/* Upward progression arrow */}
        <path
          d={`M${size * 0.5} ${size * 0.38} L${size * 0.5} ${size * 0.18}`}
          stroke="url(#sb-logo-gradient)"
          strokeWidth={size * 0.03}
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        <path
          d={`M${size * 0.42} ${size * 0.26} L${size * 0.5} ${size * 0.18} L${size * 0.58} ${size * 0.26}`}
          stroke="url(#sb-logo-gradient)"
          strokeWidth={size * 0.03}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.7"
        />
        
        {/* Subtle "S" geometry */}
        <path
          d={`M${size * 0.35} ${size * 0.5} Q${size * 0.42} ${size * 0.35} ${size * 0.5} ${size * 0.5} Q${size * 0.58} ${size * 0.65} ${size * 0.65} ${size * 0.5}`}
          stroke="url(#sb-logo-gradient)"
          strokeWidth={size * 0.015}
          strokeLinecap="round"
          fill="none"
          opacity="0.25"
        />
      </g>

      {/* Wordmark */}
      {full && (
        <g transform={`translate(${size + 8}, ${height * 0.28})`}>
          <text
            x={0}
            y={0}
            fill="url(#sb-logo-text-gradient)"
            fontSize={size * 0.45}
            fontWeight={600}
            letterSpacing={size * 0.002}
            fontFamily="var(--font-display, 'Space Grotesk', 'Inter', system-ui, sans-serif)"
          >
            SkillBridge
          </text>
          <text
            x={0}
            y={size * 0.55}
            fill="#22d3ee"
            fontSize={size * 0.3}
            fontWeight={600}
            letterSpacing={size * 0.006}
            fontFamily="var(--font-display, 'Space Grotesk', 'Inter', system-ui, sans-serif)"
          >
            AI
          </text>
        </g>
      )}
    </svg>
  )
}