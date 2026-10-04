import {
  motion,
  motionValue,
  useMotionTemplate,
  useMotionValue,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import {
  Cloud as AwsIcon,
  Box as DockerIcon,
  Code as PythonIcon,
  Database as DbIcon,
  GitBranch as GitIcon,
  Server as RestIcon,
  Square as PostgresIcon,
  Type as TsIcon,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

import { usePrefersReducedMotion } from '../motion/usePrefersReducedMotion'

// ---------------------------------------------------------------------------
// Design space
// ---------------------------------------------------------------------------
// Every coordinate lives in a fixed 500x500 design box, matching the original
// composition exactly. The scene is uniformly scaled to the container width, so
// proportions never change and `translateZ` depth scales with the box instead
// of stretching on narrow viewports.

const DESIGN = 500
const CORE = { x: 250, y: 250 }

/** Inset of the 3D stage inside its frame, design px. Gives tilted layers
 *  projected room so they never clip the frame edge. */
const SCENE_INSET = 36

interface Skill extends SkillFloat {
  id: string
  label: string
  category: string
  proficiency: number
  usedInRoles: number
  matched: boolean
  accent: string
  cx: number
  cy: number
}

interface SkillFloat {
  /** Peak vertical travel, design px. */
  ampY: number
  /** Peak horizontal travel, design px. */
  ampX: number
  /** Peak rotation, degrees. */
  ampR: number
  /** Seconds per vertical cycle. */
  periodY: number
  /** Seconds per horizontal cycle. */
  periodX: number
  /** Seconds per rotation cycle. */
  periodR: number
  phase: number
}

// 8 skills in a clock pattern around center (250,250), radius ~160px.
// Each carries its own float signature so the modules read as independent
// bodies suspended in space rather than buttons bouncing in unison.
const SKILLS: Skill[] = [
  {
    id: 'react', label: 'React', category: 'FRONTEND', proficiency: 87, usedInRoles: 14,
    matched: true, accent: '#22D3EE', cx: 250, cy: 80,
    ampY: 8, ampX: 3.5, ampR: 1.4, periodY: 5.2, periodX: 7.1, periodR: 9.4, phase: 0.0,
  },
  {
    id: 'typescript', label: 'TypeScript', category: 'FRONTEND', proficiency: 85, usedInRoles: 11,
    matched: true, accent: '#3B82F6', cx: 370, cy: 130,
    ampY: 7, ampX: 4, ampR: 1.1, periodY: 6.1, periodX: 5.4, periodR: 8.2, phase: 0.9,
  },
  {
    id: 'python', label: 'Python', category: 'BACKEND', proficiency: 78, usedInRoles: 9,
    matched: true, accent: '#22D3EE', cx: 400, cy: 250,
    ampY: 10, ampX: 3, ampR: 1.8, periodY: 4.4, periodX: 6.8, periodR: 10.6, phase: 1.8,
  },
  {
    id: 'docker', label: 'Docker', category: 'DEVOPS', proficiency: 72, usedInRoles: 6,
    matched: false, accent: '#F59E0B', cx: 370, cy: 370,
    ampY: 6, ampX: 4.5, ampR: 1.2, periodY: 6.6, periodX: 4.9, periodR: 7.7, phase: 2.7,
  },
  {
    id: 'sql', label: 'SQL', category: 'DATABASE', proficiency: 68, usedInRoles: 8,
    matched: false, accent: '#22D3EE', cx: 250, cy: 420,
    ampY: 9, ampX: 3.5, ampR: 1.6, periodY: 5.8, periodX: 7.6, periodR: 11.2, phase: 3.6,
  },
  {
    id: 'git', label: 'Git', category: 'VERSION CTL', proficiency: 83, usedInRoles: 13,
    matched: true, accent: '#F97316', cx: 150, cy: 370,
    ampY: 7.5, ampX: 5, ampR: 1.3, periodY: 4.9, periodX: 6.2, periodR: 8.8, phase: 4.5,
  },
  {
    id: 'postgresql', label: 'PostgreSQL', category: 'DATABASE', proficiency: 66, usedInRoles: 7,
    matched: false, accent: '#6366F1', cx: 120, cy: 250,
    ampY: 8.5, ampX: 3, ampR: 1.5, periodY: 7.2, periodX: 5.1, periodR: 10.1, phase: 5.4,
  },
  {
    id: 'aws', label: 'AWS', category: 'CLOUD', proficiency: 70, usedInRoles: 6,
    matched: false, accent: '#F59E0B', cx: 150, cy: 130,
    ampY: 12, ampX: 4.5, ampR: 1.7, periodY: 5.5, periodX: 8.1, periodR: 7.4, phase: 6.3,
  },
]

function ReactMark(): ReactNode {
  return (
    <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
    </g>
  )
}

const SKILL_ICON: Record<string, () => ReactNode> = {
  react: () => (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true">
      <ReactMark />
    </svg>
  ),
  typescript: () => <TsIcon size={16} strokeWidth={1.8} aria-hidden="true" />,
  python: () => <PythonIcon size={16} strokeWidth={1.8} aria-hidden="true" />,
  docker: () => <DockerIcon size={16} strokeWidth={1.8} aria-hidden="true" />,
  sql: () => <DbIcon size={16} strokeWidth={1.8} aria-hidden="true" />,
  postgresql: () => <PostgresIcon size={16} strokeWidth={1.8} aria-hidden="true" />,
  aws: () => <AwsIcon size={16} strokeWidth={1.8} aria-hidden="true" />,
  git: () => <GitIcon size={16} strokeWidth={1.8} aria-hidden="true" />,
  'rest-apis': () => <RestIcon size={16} strokeWidth={1.8} aria-hidden="true" />,
}

interface Edge {
  key: string
  skillId: string
  fx: number
  fy: number
  tx: number
  ty: number
}

const EDGES: Edge[] = SKILLS.map((s) => ({
  key: `core->${s.id}`,
  skillId: s.id,
  fx: CORE.x,
  fy: CORE.y,
  tx: s.cx,
  ty: s.cy,
}))

/** Orbital rings. `period` is seconds per revolution; `dir` alternates. */
const ORBITS = [
  { r: 55, dash: '3 6', color: 'rgba(34,211,238,0.22)', marker: '#22D3EE', period: 18, dir: 1, markers: 4 },
  { r: 90, dash: '2 8', color: 'rgba(59,130,246,0.17)', marker: '#3B82F6', period: 27, dir: -1, markers: 5 },
  { r: 125, dash: '4 10', color: 'rgba(99,102,241,0.12)', marker: '#6366F1', period: 40, dir: 1, markers: 6 },
] as const

/** Layer depths, design px, applied as translateZ on each layer wrapper. */
const Z = {
  background: -80,
  orbits: -20,
  connections: 0,
  modules: 40,
  core: 70,
  hud: 50,
} as const

/** Parallax amplitude per layer, design px, at full pointer deflection. */
const PARALLAX = {
  background: 2,
  orbits: 5,
  connections: 8,
  modules: 12,
  core: 15,
  hud: 6,
} as const

const TAU = Math.PI * 2

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------

/**
 * Under-damped spring integrator (zeta ~0.76).
 *
 * The slight overshoot and settle is what makes each layer feel like it has
 * mass instead of tracking the pointer exactly. Different stiffness per layer
 * is what produces visible inter-layer lag - the parallax.
 */
function integrate(
  current: number,
  velocity: number,
  target: number,
  stiffness: number,
  damping: number,
  dt: number,
): [number, number] {
  const accel = (target - current) * stiffness - velocity * damping
  const nextVelocity = velocity + accel * dt
  return [current + nextVelocity * dt, nextVelocity]
}

/** Frame-rate independent exponential smoothing. */
function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

/**
 * Derives a motion value from another without a hook, so it can be built in a
 * loop. The returned value carries a `detach` that must be called on unmount.
 */
function deriveMotion(source: MotionValue<number>, fn: (v: number) => number): MotionValue<number> & {
  detach: () => void
} {
  const mv = motionValue(fn(source.get())) as MotionValue<number> & { detach: () => void }
  const stop = source.on('change', (v) => mv.set(fn(v)))
  mv.detach = stop
  return mv
}

function accentShadow(accent: string, lift: number): string {
  const alpha = Math.round(18 + lift * 46).toString(16).padStart(2, '0')
  return `${accent}${alpha}`
}

// ---------------------------------------------------------------------------
// Telemetry HUD panel
// ---------------------------------------------------------------------------

function TelemetryPanel({
  label,
  value,
  accent = '#22D3EE',
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div
      style={{
        padding: '5px 8px',
        background: 'rgba(8,12,28,0.6)',
        border: `1px solid ${accent}26`,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        borderRadius: 6,
        fontFamily: 'system-ui, sans-serif',
        boxShadow: `0 6px 18px -8px ${accent}40, 0 2px 6px -2px rgba(0,0,0,0.5)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: accent,
            boxShadow: `0 0 4px ${accent}`,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 8,
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#94A3B8',
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ marginTop: 1 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#F8FAFC',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {value}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skill module
// ---------------------------------------------------------------------------

interface ModuleMotion {
  x: MotionValue<number>
  y: MotionValue<number>
  rot: MotionValue<number>
  lift: MotionValue<number>
  scale: MotionValue<number>
  shadow: MotionValue<string>
  glow: MotionValue<number>
  z: MotionValue<number>
}

function SkillModuleBody({
  skill,
  m,
  hovered,
  onEnter,
  onLeave,
}: {
  skill: Skill
  m: ModuleMotion
  hovered: boolean
  onEnter: () => void
  onLeave: () => void
}) {
  const accent = skill.accent
  const renderIcon = SKILL_ICON[skill.id] ?? (() => <DbIcon size={16} strokeWidth={1.8} />)

  // Label placement mirrors the original composition: right-hand skills label
  // to the right of the disc, left-hand skills to the left, and the two
  // vertical-axis skills label above / below.
  const isRight = skill.cx >= CORE.x
  const isCenter = Math.abs(skill.cx - CORE.x) < 30
  const isTop = skill.cy < CORE.y

  const transform = useMotionTemplate`
    translate(-50%, -50%)
    translateZ(${m.z}px)
    translate3d(${m.x}px, ${m.y}px, 0)
    rotate(${m.rot}deg)
    scale(${m.scale})
  `

  const labelStyle: CSSProperties = isCenter
    ? isTop
      ? { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }
      : { top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }
    : isRight
      ? { left: 'calc(100% + 10px)', top: '50%', transform: 'translateY(-50%)', textAlign: 'left' }
      : { right: 'calc(100% + 10px)', top: '50%', transform: 'translateY(-50%)', textAlign: 'right' }

  return (
    <motion.button
      type="button"
      tabIndex={-1}
      aria-label={`${skill.label}, ${skill.category.toLowerCase()}, ${skill.proficiency} percent`}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      className="pointer-events-auto absolute cursor-pointer border-0 bg-transparent p-0 outline-none"
      style={{
        left: `${(skill.cx / DESIGN) * 100}%`,
        top: `${(skill.cy / DESIGN) * 100}%`,
        width: 44,
        height: 44,
        marginLeft: -22,
        marginTop: -22,
        transform,
        transformStyle: 'preserve-3d',
        zIndex: hovered ? 20 : 10,
        filter: hovered ? `drop-shadow(0 14px 22px rgba(2,6,18,0.75))` : 'none',
      }}
    >
      {/* Hover ring */}
      <motion.span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          margin: 'auto',
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: `1px solid ${accent}`,
          opacity: m.glow,
          pointerEvents: 'none',
          filter: `drop-shadow(0 0 10px ${accent}66)`,
          transform: 'translateZ(6px)',
        }}
      />

      {/* Icon disc */}
      <motion.span
        style={{
          position: 'absolute',
          inset: 0,
          margin: 'auto',
          width: 32,
          height: 32,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: accent,
          background: 'rgba(8,12,28,0.85)',
          border: `1.2px solid ${hovered ? accent : `${accent}55`}`,
          boxShadow: m.shadow,
          transition: 'border-color 0.22s ease',
          transform: 'translateZ(10px)',
          pointerEvents: 'none',
        }}
      >
        {renderIcon()}
      </motion.span>

      {/* Label + category */}
      <motion.span
        style={{
          position: 'absolute',
          ...labelStyle,
          transform: `translateZ(16px) ${labelStyle.transform ?? ''}`,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          lineHeight: 1.15,
        }}
      >
        <span
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 600,
            color: '#F8FAFC',
            fontFamily: 'system-ui, sans-serif',
            textShadow: '0 2px 10px rgba(2,6,18,0.9)',
          }}
        >
          {skill.label}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: 8,
            fontWeight: 500,
            letterSpacing: '0.08em',
            color: '#94A3B8',
            fontFamily: 'system-ui, sans-serif',
            textShadow: '0 2px 8px rgba(2,6,18,0.85)',
          }}
        >
          {skill.category}
        </span>

        {/* Proficiency readout, only while hovered */}
        {hovered && (
          <span
            style={{
              display: 'block',
              marginTop: 4,
              width: 34,
              height: 3,
              borderRadius: 1.5,
              background: 'rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                display: 'block',
                height: '100%',
                width: `${skill.proficiency}%`,
                borderRadius: 1.5,
                background: skill.matched ? accent : '#F59E0B',
              }}
            />
          </span>
        )}
      </motion.span>
    </motion.button>
  )
}

// ---------------------------------------------------------------------------
// AI core — layered energy object
// ---------------------------------------------------------------------------

function CoreBody({ corePulse, reduced }: { corePulse: MotionValue<number>; reduced: boolean }) {
  // Slow independent float, deliberately out of phase with the skill modules
  // so the centre reads as a separate body powering the network.
  const floatY = useMotionValue(0)
  const floatScale = useMotionValue(1)
  const haloScale = useMotionValue(1)
  const haloOpacity = useMotionValue(0.18)
  const dotPhase = useMotionValue(0)

  useEffect(() => {
    if (reduced) return
    let frame = 0
    let previous = performance.now()
    let elapsed = 0
    const tick = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 1 / 24)
      previous = now
      elapsed += dt
      floatY.set(Math.sin((elapsed / 6.4) * TAU) * 6)
      const pulse = corePulse.get()
      floatScale.set(1 + Math.sin((elapsed / 4.1) * TAU) * 0.014 + pulse * 0.06)
      haloScale.set(1 + Math.sin((elapsed / 2.8) * TAU) * 0.14 + pulse * 0.16)
      haloOpacity.set(0.14 + (Math.sin((elapsed / 2.8) * TAU) + 1) * 0.14 + pulse * 0.22)
      dotPhase.set((dotPhase.get() + (TAU / 26) * dt) % TAU)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reduced, floatY, floatScale, haloScale, haloOpacity, dotPhase, corePulse])

  const transform = useMotionTemplate`translate3d(0, ${floatY}px, 12px) scale(${floatScale})`
  const dots = useMemo(
    () => [
      { r: 70, speed: 1 / 22, dir: 1, phase: 0, size: 1.8, color: '#67E8F9' },
      { r: 78, speed: 1 / 31, dir: -1, phase: 1.3, size: 1.2, color: '#818CF8' },
      { r: 62, speed: 1 / 27, dir: 1, phase: 2.6, size: 1.5, color: '#67E8F9' },
      { r: 84, speed: 1 / 38, dir: -1, phase: 4.0, size: 1.1, color: '#A5F3FC' },
      { r: 74, speed: 1 / 19, dir: 1, phase: 5.2, size: 1.6, color: '#818CF8' },
    ],
    [],
  )

  // Each dot's angle derived from the shared phase motion value.
  const dotAngles = useMemo(
    () =>
      dots.map((d) =>
        deriveMotion(dotPhase, (v) => (v * d.speed * TAU * d.dir + d.phase) % TAU),
      ),
    [dotPhase, dots],
  )
  useEffect(
    () => () => {
      dotAngles.forEach((a) => a.detach())
    },
    [dotAngles],
  )

  return (
    <motion.div
      className="absolute"
      style={{
        left: '50%',
        top: '50%',
        width: 120,
        height: 120,
        marginLeft: -60,
        marginTop: -60,
        transformStyle: 'preserve-3d',
        transform,
      }}
    >
      <svg viewBox="0 0 240 240" className="h-full w-full" style={{ overflow: 'visible' }} aria-hidden="true">
        <defs>
          <radialGradient id="hcn-core-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="45%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#4338CA" />
          </radialGradient>
          <radialGradient id="hcn-core-inner" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
          </radialGradient>
          <filter id="hcn-core-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer energy ring, slowly turning */}
        <motion.circle
          cx="120"
          cy="120"
          r="92"
          fill="none"
          stroke="#22D3EE"
          strokeWidth="1"
          strokeDasharray="2 9"
          initial={{ opacity: 0.18 }}
          animate={reduced ? undefined : { opacity: [0.16, 0.4, 0.16], rotate: [0, 360] }}
          transition={{
            opacity: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' },
            rotate: { duration: 44, repeat: Infinity, ease: 'linear' },
          }}
          style={{ transformOrigin: '120px 120px' }}
        />

        {/* Pulsing halo */}
        <motion.circle
          cx="120"
          cy="120"
          r="64"
          fill="none"
          stroke="#22D3EE"
          strokeWidth="1.2"
          style={{ scale: haloScale, opacity: haloOpacity, transformOrigin: '120px 120px' }}
        />

        {/* Inner ring */}
        <circle cx="120" cy="120" r="52" fill="none" stroke="rgba(139,92,246,0.42)" strokeWidth="1" strokeDasharray="4 7" />

        {/* Core body */}
        <circle cx="120" cy="120" r="48" fill="url(#hcn-core-grad)" filter="url(#hcn-core-glow)" />
        <circle cx="120" cy="120" r="48" fill="none" stroke="#8B5CF6" strokeWidth="1" opacity={0.8} />
        <circle cx="120" cy="120" r="48" fill="url(#hcn-core-inner)" />

        {/* Tiny orbiting particles */}
        {dots.map((d, i) => (
          <motion.circle
            key={i}
            cx="120"
            cy={120 - d.r}
            r={d.size}
            fill={d.color}
            opacity={0.8}
            style={{
              transformOrigin: '120px 120px',
              rotate: dotAngles[i],
              filter: `drop-shadow(0 0 4px ${d.color})`,
            }}
          />
        ))}

        <text
          x="120"
          y="112"
          textAnchor="middle"
          fill="#F8FAFC"
          fontSize="44"
          fontWeight={700}
          fontFamily="'Space Grotesk','Inter',system-ui,sans-serif"
        >
          AI
        </text>
        <text
          x="120"
          y="136"
          textAnchor="middle"
          fill="#94A3B8"
          fontSize="14"
          fontWeight={500}
          fontFamily="'JetBrains Mono',monospace"
          letterSpacing="0.18em"
        >
          CORE
        </text>
      </svg>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function HeroCareerNetwork() {
  const reduced = usePrefersReducedMotion()

  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null)

  // Raw pointer target, normalised to [-1, 1]. Only a target is stored here;
  // integration happens in the rAF loop so motion is always physical.
  const pointerTarget = useRef({ x: 0, y: 0, inside: false })
  const hoveredRef = useRef<string | null>(null)

  // Smoothed pointer (drives tilt) and a softer lag (drives parallax).
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const lagX = useMotionValue(0)
  const lagY = useMotionValue(0)
  const velX = useRef(0)
  const velY = useRef(0)
  const lagVelX = useRef(0)
  const lagVelY = useRef(0)

  // Cursor light position, design px.
  const lightX = useMotionValue(DESIGN / 2)
  const lightY = useMotionValue(DESIGN / 2)

  // Tilt targets in degrees: rotateY +/-10, rotateX +/-7, per spec.
  const tiltX = useMotionValue(0)
  const tiltY = useMotionValue(0)
  const tiltVelX = useRef(0)
  const tiltVelY = useRef(0)

  // Scene scale -> applied to the 3D stage so translateZ scales with the box.
  const scaleMV = useMotionValue(1)
  useEffect(() => {
    scaleMV.set(scale)
  }, [scale, scaleMV])

  // AI core pulse strength, raised while a skill is hovered.
  const corePulse = useMotionValue(0)

  // Per-module motion values, created once so the loop never re-renders React.
  const modules = useMemo<ModuleMotion[]>(
    () =>
      SKILLS.map(() => ({
        x: motionValue(0),
        y: motionValue(0),
        rot: motionValue(0),
        lift: motionValue(0),
        scale: motionValue(1),
        shadow: motionValue('0 8px 18px -10px rgba(2,6,18,0.9)'),
        glow: motionValue(0),
        z: motionValue<number>(Z.modules),
      })),
    [],
  )

  const orbitAngles = useMemo(() => ORBITS.map(() => motionValue(0)), [])
  const edgeStrength = useMemo(() => EDGES.map(() => motionValue(0)), [])
  const particlePhase = useMemo(() => EDGES.map((_, i) => motionValue(i / EDGES.length)), [])

  // Derived per-edge visuals: stroke weight, opacity and particle position.
  // Built once; the animation loop only writes the source values.
  const edgeVisuals = useMemo(
    () =>
      EDGES.map((edge, i) => ({
        edge,
        width: deriveMotion(edgeStrength[i], (v) => 0.6 + v * 1.4),
        opacity: deriveMotion(edgeStrength[i], (v) => 0.22 + v * 0.62),
        px: deriveMotion(particlePhase[i], (v) => edge.fx + (edge.tx - edge.fx) * ((((v % 1) + 1) % 1))),
        py: deriveMotion(particlePhase[i], (v) => edge.fy + (edge.ty - edge.fy) * ((((v % 1) + 1) % 1))),
        trailX: deriveMotion(particlePhase[i], (v) => {
          const t = ((((v - 0.05) % 1) + 1) % 1)
          return edge.fx + (edge.tx - edge.fx) * t
        }),
        trailY: deriveMotion(particlePhase[i], (v) => {
          const t = ((((v - 0.05) % 1) + 1) % 1)
          return edge.fy + (edge.ty - edge.fy) * t
        }),
      })),
    [edgeStrength, particlePhase],
  )

  const derived = useMemo(() => edgeVisuals.flatMap((e) => [e.width, e.opacity, e.px, e.py, e.trailX, e.trailY]), [edgeVisuals])
  useEffect(
    () => () => {
      derived.forEach((d) => d.detach())
    },
    [derived],
  )

  useEffect(() => {
    hoveredRef.current = hoveredSkill
  }, [hoveredSkill])

  // Resize -> uniform design-space scale.
  useEffect(() => {
    const node = frameRef.current
    if (!node) return
    const measure = () => {
      const width = node.clientWidth
      if (width > 0) setScale(width / DESIGN)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(node)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  // Pointer capture.
  useEffect(() => {
    const node = frameRef.current
    if (!node || reduced) return

    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1
      pointerTarget.current = {
        x: Math.max(-1, Math.min(1, nx)),
        y: Math.max(-1, Math.min(1, ny)),
        inside: true,
      }
      lightX.set(nx * (DESIGN / 2) + DESIGN / 2)
      lightY.set(ny * (DESIGN / 2) + DESIGN / 2)
    }

    const onLeave = () => {
      pointerTarget.current = { x: 0, y: 0, inside: false }
      lightX.set(DESIGN / 2)
      lightY.set(DESIGN / 2)
    }

    node.addEventListener('pointermove', onMove, { passive: true })
    node.addEventListener('pointerleave', onLeave)
    node.addEventListener('pointercancel', onLeave)
    return () => {
      node.removeEventListener('pointermove', onMove)
      node.removeEventListener('pointerleave', onLeave)
      node.removeEventListener('pointercancel', onLeave)
    }
  }, [reduced, lightX, lightY])

  // The physics loop: pointer springs, per-layer parallax, per-module float,
  // orbital rotation, travelling particles and core pulse - one rAF total.
  useEffect(() => {
    let frame = 0

    if (reduced) {
      modules.forEach((m) => {
        m.y.set(0)
        m.x.set(0)
        m.rot.set(0)
        m.lift.set(0)
        m.scale.set(1)
        m.glow.set(0)
        m.z.set(Z.modules)
        m.shadow.set('0 8px 18px -10px rgba(2,6,18,0.9)')
      })
      return
    }

    let previous = performance.now()
    let elapsed = 0

    const tick = (now: number) => {
      // Clamp dt so a backgrounded tab cannot teleport the springs.
      const dt = Math.min((now - previous) / 1000, 1 / 24)
      previous = now
      elapsed += dt

      const target = pointerTarget.current
      const active = target.inside ? 1 : 0

      // Pointer tilt spring (stiff).
      const [px, pvx] = integrate(pointerX.get(), velX.current, target.x * active, 110, 16, dt)
      pointerX.set(px)
      velX.current = pvx
      const [py, pvy] = integrate(pointerY.get(), velY.current, target.y * active, 110, 16, dt)
      pointerY.set(py)
      velY.current = pvy

      // Parallax spring (softer -> visible lag between layers).
      const [lx, lvx] = integrate(lagX.get(), lagVelX.current, target.x * active, 42, 11, dt)
      lagX.set(lx)
      lagVelX.current = lvx
      const [ly, lvy] = integrate(lagY.get(), lagVelY.current, target.y * active, 42, 11, dt)
      lagY.set(ly)
      lagVelY.current = lvy

      // Tilt (stiffest: the whole object feels connected to the hand).
      const [tx, tvx] = integrate(tiltX.get(), tiltVelX.current, target.y * active * -7, 90, 13, dt)
      tiltX.set(tx)
      tiltVelX.current = tvx
      const [ty, tvy] = integrate(tiltY.get(), tiltVelY.current, target.x * active * 10, 90, 13, dt)
      tiltY.set(ty)
      tiltVelY.current = tvy

      // Orbital rings, alternating direction at 18s / 27s / 40s.
      for (let i = 0; i < ORBITS.length; i += 1) {
        const orbit = ORBITS[i]
        orbitAngles[i].set((((elapsed / orbit.period) * TAU * orbit.dir) % TAU + TAU) % TAU)
      }

      // Skill modules.
      const hovered = hoveredRef.current
      for (let i = 0; i < SKILLS.length; i += 1) {
        const skill = SKILLS[i]
        const m = modules[i]
        const isHovered = hovered === skill.id

        // Independent zero-gravity float: unique periods per module so the
        // group never falls into a visible rhythm.
        m.y.set(Math.sin((elapsed / skill.periodY) * TAU + skill.phase) * skill.ampY)
        m.x.set(Math.sin((elapsed / skill.periodX) * TAU + skill.phase * 1.7) * skill.ampX)
        m.rot.set(Math.sin((elapsed / skill.periodR) * TAU + skill.phase * 0.9) * skill.ampR)

        // Hover: lift out of the plane, tip toward the viewer, deepen shadow.
        m.lift.set(damp(m.lift.get(), isHovered ? 30 : 0, 9, dt))
        m.scale.set(damp(m.scale.get(), isHovered ? 1.08 : 1, 9, dt))
        m.z.set(damp(m.z.get(), isHovered ? 70 : Z.modules, 9, dt))
        m.glow.set(damp(m.glow.get(), isHovered ? 0.55 : 0, 9, dt))

        const lift = m.lift.get() / 30
        m.shadow.set(
          lift > 0.02
            ? `0 ${12 + lift * 10}px ${20 + lift * 16}px -${10 - lift * 2}px rgba(2,6,18,${(0.55 + lift * 0.3).toFixed(2)}), 0 0 ${8 + lift * 22}px ${accentShadow(skill.accent, lift)}`
            : '0 8px 18px -10px rgba(2,6,18,0.9)',
        )
      }

      // Edge strength + travelling data particles (SKILL -> AI).
      for (let i = 0; i < EDGES.length; i += 1) {
        const isHovered = hovered === EDGES[i].skillId
        edgeStrength[i].set(damp(edgeStrength[i].get(), isHovered ? 1 : 0, 8, dt))
        const speed = 0.09 + edgeStrength[i].get() * 0.55
        particlePhase[i].set((particlePhase[i].get() + speed * dt) % 1)
      }

      // AI core reacts to any active module.
      corePulse.set(damp(corePulse.get(), hovered !== null ? 1 : 0, 6, dt))

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [
    reduced, modules, orbitAngles, edgeStrength, particlePhase, corePulse,
    pointerX, pointerY, lagX, lagY, tiltX, tiltY,
  ])

  const onEnterSkill = useCallback((id: string) => setHoveredSkill(id), [])
  const onLeaveSkill = useCallback(() => setHoveredSkill(null), [])

  // --- Derived transforms -------------------------------------------------

  // Per-layer parallax offsets. `useTransform` rather than `motionValue * n`
  // so the arithmetic is typed and the values stay on the compositor.
  const bgX = useTransform(lagX, (v) => v * PARALLAX.background)
  const bgY = useTransform(lagY, (v) => v * PARALLAX.background)
  const orbitX = useTransform(lagX, (v) => v * PARALLAX.orbits)
  const orbitY = useTransform(lagY, (v) => v * PARALLAX.orbits)
  const connX = useTransform(lagX, (v) => v * PARALLAX.connections)
  const connY = useTransform(lagY, (v) => v * PARALLAX.connections)
  const modX = useTransform(lagX, (v) => v * PARALLAX.modules)
  const modY = useTransform(lagY, (v) => v * PARALLAX.modules)
  const coreX = useTransform(lagX, (v) => v * PARALLAX.core)
  const coreY = useTransform(lagY, (v) => v * PARALLAX.core)
  const hudX = useTransform(lagX, (v) => v * PARALLAX.hud)
  const hudY = useTransform(lagY, (v) => v * PARALLAX.hud)

  const stageTransform = useMotionTemplate`scale(${scaleMV}) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`

  const backgroundTransform = useMotionTemplate`translateZ(${Z.background}px) translate3d(${bgX}px, ${bgY}px, 0)`
  const orbitTransform = useMotionTemplate`translateZ(${Z.orbits}px) translate3d(${orbitX}px, ${orbitY}px, 0)`
  const connectionTransform = useMotionTemplate`translateZ(${Z.connections}px) translate3d(${connX}px, ${connY}px, 0)`
  const moduleLayerTransform = useMotionTemplate`translateZ(${Z.modules}px) translate3d(${modX}px, ${modY}px, 0)`
  const coreTransform = useMotionTemplate`translateZ(${Z.core}px) translate3d(${coreX}px, ${coreY}px, 0)`
  const hudTransform = useMotionTemplate`translateZ(${Z.hud}px) translate3d(${hudX}px, ${hudY}px, 0)`

  // Cursor-following light: a light source, not a glowing orb.
  const lightBackground = useMotionTemplate`radial-gradient(340px circle at ${lightX}px ${lightY}px, rgba(34,211,238,0.13) 0%, rgba(99,102,241,0.07) 38%, transparent 72%)`

  return (
    <div
      ref={frameRef}
      className="relative mx-auto aspect-square w-full"
      style={{ maxWidth: 520, perspective: '900px', perspectiveOrigin: '50% 50%' }}
    >
      {/* Ambient backdrop frame. Clipped so the grid and glow wash can never
          widen the document; the 3D stage below is a sibling, not a child. */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(34,211,238,0.05) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(rgba(148,163,184,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.025) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${((i * 17 + 12) % 88) + 6}%`,
              top: `${((i * 23 + 8) % 88) + 6}%`,
              width: i % 2 === 0 ? 1.5 : 1,
              height: i % 2 === 0 ? 1.5 : 1,
              opacity: 0.22,
            }}
          />
        ))}
      </div>

      {/* Cursor light source */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ background: lightBackground }}
        aria-hidden="true"
      />

      {/* ===================== 3D STAGE ===================== */}
      <motion.div
        className="absolute"
        style={{
          left: SCENE_INSET,
          top: SCENE_INSET,
          right: SCENE_INSET,
          bottom: SCENE_INSET,
          transformStyle: 'preserve-3d',
          transform: stageTransform,
          willChange: 'transform',
        }}
        aria-hidden="true"
      >
        {/* ---- BACKGROUND (z: -80) ---- */}
        <motion.div
          className="absolute inset-0"
          style={{ transform: backgroundTransform, transformStyle: 'preserve-3d' }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(34,211,238,0.07) 0%, transparent 62%)',
            }}
          />
        </motion.div>

        {/* ---- ORBITAL RINGS (z: -20) ---- */}
        <motion.div
          className="absolute inset-0"
          style={{ transform: orbitTransform, transformStyle: 'preserve-3d' }}
        >
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${DESIGN} ${DESIGN}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ overflow: 'visible' }}
          >
            {ORBITS.map((orbit, i) => (
              <motion.g
                key={i}
                style={{ rotate: orbitAngles[i], transformOrigin: `${CORE.x}px ${CORE.y}px` }}
              >
                <circle
                  cx={CORE.x}
                  cy={CORE.y}
                  r={orbit.r}
                  fill="none"
                  stroke={orbit.color}
                  strokeWidth={0.8}
                  strokeDasharray={orbit.dash}
                />
                {Array.from({ length: orbit.markers }).map((_, m) => {
                  const a = (m / orbit.markers) * Math.PI * 2 + i * 0.8
                  return (
                    <circle
                      key={m}
                      cx={CORE.x + orbit.r * Math.cos(a)}
                      cy={CORE.y + orbit.r * Math.sin(a)}
                      r={1.3}
                      fill={orbit.marker}
                      opacity={0.55}
                    />
                  )
                })}
              </motion.g>
            ))}

            {/* Inner segmented ring */}
            <motion.g style={{ rotate: orbitAngles[0], transformOrigin: `${CORE.x}px ${CORE.y}px` }}>
              <circle
                cx={CORE.x}
                cy={CORE.y}
                r={42}
                fill="none"
                stroke="rgba(99,102,241,0.32)"
                strokeWidth={0.8}
                strokeDasharray="2 5"
              />
            </motion.g>
          </svg>
        </motion.div>

        {/* ---- CONNECTIONS (z: 0) ---- */}
        <motion.div
          className="absolute inset-0"
          style={{ transform: connectionTransform, transformStyle: 'preserve-3d' }}
        >
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${DESIGN} ${DESIGN}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ overflow: 'visible' }}
          >
            {edgeVisuals.map(({ edge, width, opacity, px, py, trailX, trailY }) => {
              const active = hoveredSkill === edge.skillId
              return (
                <g key={edge.key}>
                  <motion.line
                    x1={edge.fx}
                    y1={edge.fy}
                    x2={edge.tx}
                    y2={edge.ty}
                    stroke="#22D3EE"
                    strokeWidth={width}
                    strokeDasharray={active ? '0' : '3 5'}
                    strokeLinecap="round"
                    opacity={opacity}
                    style={active ? { filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.75))' } : undefined}
                  />

                  {/* Travelling data particle with a short trail */}
                  <motion.circle cx={trailX} cy={trailY} r={1.1} fill="#22D3EE" opacity={0.26} />
                  <motion.circle
                    cx={px}
                    cy={py}
                    r={1.7}
                    fill="#67E8F9"
                    opacity={0.9}
                    style={{ filter: 'drop-shadow(0 0 5px rgba(34,211,238,0.9))' }}
                  />
                  {active && (
                    <motion.circle
                      cx={trailX}
                      cy={trailY}
                      r={2.6}
                      fill="#22D3EE"
                      opacity={0.32}
                      style={{ filter: 'drop-shadow(0 0 12px rgba(34,211,238,0.85))' }}
                    />
                  )}
                </g>
              )
            })}
          </svg>
        </motion.div>

        {/* ---- AI CORE (z: 70) ---- */}
        <motion.div
          className="absolute inset-0"
          style={{ transform: coreTransform, transformStyle: 'preserve-3d' }}
        >
          <CoreBody corePulse={corePulse} reduced={reduced} />
        </motion.div>

        {/* ---- SKILL MODULES (z: 40) ---- */}
        <motion.div
          className="absolute inset-0"
          style={{ transform: moduleLayerTransform, transformStyle: 'preserve-3d' }}
        >
          {SKILLS.map((skill, i) => (
            <SkillModuleBody
              key={skill.id}
              skill={skill}
              m={modules[i]}
              hovered={hoveredSkill === skill.id}
              onEnter={() => onEnterSkill(skill.id)}
              onLeave={onLeaveSkill}
            />
          ))}
        </motion.div>

        {/* ---- HUD (z: 50) ---- */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ transform: hudTransform, transformStyle: 'preserve-3d' }}
        >
          <motion.div
            className="absolute"
            style={{ top: '1%', right: '0%' }}
            animate={reduced ? undefined : { y: [-2, 2, -2] }}
            transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <TelemetryPanel label="SKILL GRAPH" value="Active" accent="#22D3EE" />
          </motion.div>
          <motion.div
            className="absolute"
            style={{ bottom: '1%', right: '0%' }}
            animate={reduced ? undefined : { y: [2, -2, 2] }}
            transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          >
            <TelemetryPanel label="CAREER SIGNAL" value="Online" accent="#6366F1" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Accessible summary - the 3D layer itself is decorative. */}
      <span className="sr-only">
        Skill graph of eight skills around an AI core: React, TypeScript, Python, Docker, SQL, Git,
        PostgreSQL and AWS.
      </span>
    </div>
  )
}
