import type { SVGProps } from 'react'

/**
 * SkillBridge AI wordmark logo.
 *
 * One reusable SVG that renders the same mark everywhere — navbar, sidebar,
 * landing page, auth shell, footer and (as a tiny variant) the favicon. Keeping
 * the logo as a single source of truth avoids drifting brand marks across the
 * UI.
 *
 * The mark is an abstract bridge: two anchor rails and a central span, with a
 * subtle node at the crossing. The name sits to the right so the component can
 * be scaled from a 16px favicon up to a full logo lockup.
 */
interface SkillBridgeLogoProps extends SVGProps<SVGSVGElement> {
  /** Total width in pixels. Height is computed to keep aspect ratio. */
  size?: number
  /**
   * When true, render the compact favicon-only mark (no wordmark). Used by the
   * browser tab icon.
   */
  favicon?: boolean
}

const MARK_PATH =
  // Two rails
  'M3 17 L19 5 M3 5 L19 17'
  // Central span
  + ' M7 12 L15 12'
  // Anchor nodes
  + ' M3 17 a2 2 0 1 1 4 0 M19 5 a2 2 0 1 1 -4 0'
  // Crossing node
  + ' M11 12 a1.5 1.5 0 1 1 3 0'

export function SkillBridgeLogo({ size = 128, favicon = false, ...rest }: SkillBridgeLogoProps) {
  const width = size
  const height = Math.round(size * (favicon ? 1 : 1.18))

  if (favicon) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden
        focusable={false}
        {...rest}
      >
        <rect width={size} height={size} fill="none" />
        <g stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d={MARK_PATH} />
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
      {/* Wordmark. For the target size this keeps the brand legible at small
          sizes too — the lockup is readable down to ~32px total width. */}
      <style>{`
        text {
          font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI',
            'Helvetica Neue', Arial, 'Noto Sans', 'Noto Sans JP', sans-serif;
        }
      `}</style>

      {/* Brand mark — the bridge, on the left. */}
      <g transform={`translate(0, ${(height - width) / 2})`}>
        <rect
          x={0}
          y={0}
          width={width * 0.32}
          height={width}
          rx={width * 0.06}
          fill="none"
        />
        <g transform={`translate(${width * 0.04}, 0)`}>
          {/* Anchor nodes */}
          <circle cx={width * 0.06} cy={width * 0.78} r={width * 0.035} fill="currentColor" />
          <circle cx={width * 0.26} cy={width * 0.22} r={width * 0.035} fill="currentColor" />
          {/* Rails */}
          <path
            d={`M${width * 0.06} ${width * 0.78} L${width * 0.26} ${width * 0.22}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={Math.max(1, width * 0.012)}
            strokeLinecap="round"
            opacity={0.85}
          />
          {/* Central span */}
          <path
            d={`M${width * 0.12} ${width * 0.5} L${width * 0.2} ${width * 0.5}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={Math.max(1, width * 0.015)}
            strokeLinecap="round"
          />
          {/* Crossing node */}
          <circle
            cx={width * 0.16}
            cy={width * 0.5}
            r={Math.max(1.5, width * 0.028)}
            fill="currentColor"
          />
        </g>
      </g>

      {/* Wordmark */}
      <g transform={`translate(${width * 0.36}, ${height * 0.24})`}>
        <text
          x={0}
          y={0}
          fill="currentColor"
          fontSize={width * 0.13}
          fontWeight={600}
          letterSpacing={width * 0.004}
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
        >
          AI
        </text>
      </g>
    </svg>
  )
}

/**
 * Tiny favicon-only variant (browser tab icon). Exported separately so the
 * build can drop it into a static PNG at build time if a platform needs one; by
 * default the app registers the same SVG inline on the document head.
 */
export function SkillBridgeFavicon() {
  return <SkillBridgeLogo size={32} favicon />
}
