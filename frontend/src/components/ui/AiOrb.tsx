interface AiOrbProps {
  /** Diameter in pixels. */
  size?: number
  className?: string
}

/**
 * Signature visual element #1 (spec §21): the SkillBridge intelligence orb.
 * Decorative only, so it is hidden from assistive technology.
 */
export function AiOrb({ size = 220, className = '' }: AiOrbProps) {
  return (
    <div
      className={`sb-orb ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="sb-orb__glow" />
      <span className="sb-orb__ring" />
      <span className="sb-orb__ring sb-orb__ring--inner" />
      <span className="sb-orb__core" />
    </div>
  )
}
