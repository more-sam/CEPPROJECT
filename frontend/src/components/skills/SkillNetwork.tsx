import type { SkillConstellationNode } from '../../types'

const STATE_COLOR: Record<SkillConstellationNode['state'], string> = {
  owned: '#34d399',
  learning: '#818cf8',
  gap: '#fbbf24',
}

const WIDTH = 720
const HEIGHT = 460

/**
 * Signature visual #2 (spec §21): the skill constellation.
 *
 * Positions are deterministic (golden-angle spiral) so the same skill set
 * always renders the same shape - a stable map rather than random noise.
 */
export function SkillNetwork({ nodes }: { nodes: SkillConstellationNode[] }) {
  if (nodes.length === 0) {
    return (
      <div className="grid h-56 place-items-center text-xs text-slate-500">
        Add skills to build your constellation.
      </div>
    )
  }

  const cx = WIDTH / 2
  const cy = HEIGHT / 2
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))

  const placed = nodes.map((node, index) => {
    // Three orbital bands keep labels from colliding near the centre.
    const band = index % 3
    const baseRadius = [120, 178, 224][band]
    const angle = index * goldenAngle
    // Tiny deterministic variation so rings do not look mechanically perfect.
    const radius = baseRadius + (index % 5) * 6
    return {
      ...node,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle) * 0.78,
    }
  })

  return (
    <div className="overflow-hidden">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Skill constellation with ${nodes.length} skills`}
      >
        {/* Connection web: each node links to the centre orb. */}
        <circle cx={cx} cy={cy} r={6} fill="#6366f1" opacity={0.9} />
        <circle cx={cx} cy={cy} r={26} fill="none" stroke="#6366f1" strokeOpacity={0.25} />

        {placed.map((node) => {
          const color = STATE_COLOR[node.state]
          return (
            <line
              key={`edge-${node.slug}`}
              x1={cx}
              y1={cy}
              x2={node.x}
              y2={node.y}
              stroke={color}
              strokeOpacity={0.18}
              strokeWidth={1}
            />
          )
        })}

        {placed.map((node) => {
          const color = STATE_COLOR[node.state]
          return (
            <g key={node.slug}>
              <circle
                cx={node.x}
                cy={node.y}
                r={node.state === 'owned' ? 22 : 18}
                fill={`${color}22`}
                stroke={color}
                strokeOpacity={0.35}
              />
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                fontSize={11}
                fill="#e2e8f0"
                style={{ pointerEvents: 'none' }}
              >
                {node.name.length > 13 ? `${node.name.slice(0, 12)}…` : node.name}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
        <Legend color={STATE_COLOR.owned} label="Owned" />
        <Legend color={STATE_COLOR.learning} label="Learning" />
        <Legend color={STATE_COLOR.gap} label="Gap" />
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  )
}
