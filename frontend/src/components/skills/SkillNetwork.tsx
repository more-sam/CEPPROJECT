import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { SkillConstellationNode } from '../../types'
import { duration, ease } from '../../motion/tokens'
import { useHasFinePointer } from '../../motion/usePrefersReducedMotion'

const STATE_COLOR: Record<SkillConstellationNode['state'], string> = {
  owned: '#34d399',
  learning: '#818cf8',
  gap: '#fbbf24',
}

const STATE_LABEL: Record<SkillConstellationNode['state'], string> = {
  owned: 'Owned',
  learning: 'Learning',
  gap: 'Gap',
}

const WIDTH = 720
const HEIGHT = 460

/**
 * Skill constellation.
 *
 * Deterministic positions from a golden-angle spiral, with a light spring field
 * so nodes react when the pointer moves nearby: they are repelled, then settle
 * back on a damped spring. The effect is scoped deliberately small so the map
 * stays readable and the motion reads as the surface itself having depth, not
 * as something flying away.
 *
 * Hover expands the ring and floats a detail card in, because the graph is
 * otherwise very dense on mobile: shrinking the ring to save pixels only makes
 * it illegible, so the ring itself grows.
 */
export function SkillNetwork({ nodes }: { nodes: SkillConstellationNode[] }) {
  const reduced = useReducedMotion()
  const finePointer = useHasFinePointer()
  const groupRef = useRef<SVGGElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [hovered, setHovered] = useState<string | null>(null)

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

  const placed = useMemo(
    () =>
      nodes.map((node, index) => {
        const band = index % 3
        const baseRadius = [120, 178, 224][band]
        const angle = index * goldenAngle
        const radius = baseRadius + (index % 5) * 6
        return {
          ...node,
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle) * 0.78,
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `nodes` is intentionally derived from the caller; width/height are constants.
    [nodes],
  )

  // Light physics: pointer repulsion + spring return. Direct DOM writes via
  // `data-node` so the loop never triggers a React render. Disabled under
  // reduced motion or on touch where there is no cursor to repel from.
  useEffect(() => {
    if (reduced || !finePointer) return undefined

    const group = groupRef.current
    const svg = svgRef.current
    if (!group || !svg) return undefined

    const elements: SVGElement[] = Array.from(group.querySelectorAll('[data-node]'))
    if (elements.length === 0) return undefined

    const state = placed.map((point) => ({ x: point.x, y: point.y, vx: 0, vy: 0 }))

    let pointerX = -9999
    let pointerY = -9999
    let frame = 0

    const stiffness = 0.038
    const damping = 0.16
    const radius = 90
    const strength = 14

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      const bounds = svg.getBoundingClientRect()
      if (bounds.width === 0 || bounds.height === 0) return
      pointerX = (event.clientX - bounds.left) * (WIDTH / bounds.width)
      pointerY = (event.clientY - bounds.top) * (HEIGHT / bounds.height)
    }

    const onLeave = () => {
      pointerX = -9999
      pointerY = -9999
    }

    const tick = () => {
      for (let i = 0; i < state.length; i += 1) {
        const anchor = placed[i]
        const node = state[i]
        const element = elements[i]
        if (!element) continue

        let fx = (anchor.x - node.x) * stiffness
        let fy = (anchor.y - node.y) * stiffness

        const dx = node.x - pointerX
        const dy = node.y - pointerY
        const distance = Math.hypot(dx, dy)
        if (distance < radius && distance > 0.5) {
          const force = (1 - distance / radius) * strength
          fx += (dx / distance) * force * 0.1
          fy += (dy / distance) * force * 0.1
        }

        node.vx = (node.vx + fx) * (1 - damping)
        node.vy = (node.vy + fy) * (1 - damping)
        node.x += node.vx
        node.y += node.vy

        element.setAttribute('transform', `translate(${node.x - anchor.x} ${node.y - anchor.y})`)
      }

      frame = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerout', onLeave)
    frame = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerout', onLeave)
      cancelAnimationFrame(frame)
    }
  }, [reduced, finePointer, placed])

  const activeNode = hovered ? placed.find((node) => node.slug === hovered) : null

  return (
    <div className="overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Skill constellation with ${nodes.length} skills`}
        onPointerLeave={() => setHovered(null)}
      >
        {/* Centre hub. */}
        <motion.g
          initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: duration.viz, ease: ease.out }}
        >
          <circle cx={cx} cy={cy} r={6} fill="#6366f1" opacity={0.9} />
          <circle cx={cx} cy={cy} r={26} fill="none" stroke="#6366f1" strokeOpacity={0.25} />
          {/* A faint inner pulse that breathes once, then settles. */}
          {!reduced && (
            <motion.circle
              cx={cx}
              cy={cy}
              r={26}
              fill="none"
              stroke="#6366f1"
              strokeOpacity={0.18}
              initial={{ opacity: 0.35, scale: 0.86 }}
              animate={{ opacity: 0, scale: 1.18 }}
              transition={{ duration: 1.2, ease: ease.out, repeat: 1, repeatType: 'reverse' }}
            />
          )}
        </motion.g>

        {/* Edges. Each draws itself once, with the furthest nodes starting last so
            the web forms from the centre outward. */}
        {placed.map((node, index) => {
          const color = STATE_COLOR[node.state]
          const dimmed = hovered !== null && hovered !== node.slug
          return (
            <motion.line
              key={`edge-${node.slug}`}
              x1={cx}
              y1={cy}
              x2={node.x}
              y2={node.y}
              stroke={color}
              strokeOpacity={dimmed ? 0.08 : 0.18}
              strokeWidth={hovered === node.slug ? 2 : 1}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: reduced ? 0.001 : duration.viz,
                ease: ease.out,
                delay: reduced ? 0 : index * 0.05,
              }}
            />
          )
        })}

        {/* Nodes. Each node group is translated by the physics hook (data-node);
            the inside g handles hover scaling via framer so both influences compose. */}
        <g ref={groupRef}>
          {placed.map((node, index) => {
            const color = STATE_COLOR[node.state]
            const isHovered = hovered === node.slug
            const isDimmed = hovered !== null && !isHovered

            return (
              <g
                key={node.slug}
                data-node={node.slug}
                onPointerEnter={() => setHovered(node.slug)}
                className={reduced ? '' : 'cursor-pointer'}
              >
                <motion.g
                  initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.72, y: 8 }}
                  animate={{
                    opacity: isDimmed ? 0.34 : 1,
                    scale: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: reduced ? 0 : index * 0.05,
                    duration: duration.normal,
                    ease: ease.out,
                  }}
                  whileHover={reduced ? undefined : { scale: 1.07 }}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isHovered ? 28 : node.state === 'owned' ? 22 : 18}
                    fill={`${color}22`}
                    stroke={color}
                    strokeOpacity={isHovered ? 0.55 : 0.35}
                    style={{ transition: 'r 160ms ease-out' }}
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    fontSize={11}
                    fill={isHovered ? '#f8fafc' : '#e2e8f0'}
                    style={{ pointerEvents: 'none', fontWeight: isHovered ? 700 : 500 }}
                  >
                    {node.name.length > 13 ? `${node.name.slice(0, 12)}…` : node.name}
                  </text>
                </motion.g>
              </g>
            )
          })}
        </g>
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
        <Legend color={STATE_COLOR.owned} label="Owned" />
        <Legend color={STATE_COLOR.learning} label="Learning" />
        <Legend color={STATE_COLOR.gap} label="Gap" />
      </div>

      {/* Detail card for the hovered node. */}
      <AnimatePresence>
        {activeNode && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18, ease: ease.out }}
            className="sb-glass mx-auto mt-2 flex max-w-sm items-center justify-between gap-3 rounded-xl px-3.5 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{activeNode.name}</p>
              <p className="text-[11px] text-text-muted">{activeNode.category}</p>
            </div>
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
              style={{ background: STATE_COLOR[activeNode.state] }}
            >
              {STATE_LABEL[activeNode.state]}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
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
