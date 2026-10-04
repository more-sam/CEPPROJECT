import { useEffect, useRef } from 'react'

import { useDocumentVisible, usePrefersReducedMotion } from './usePrefersReducedMotion'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  /** Base opacity; twinkles around it. */
  alpha: number
  phase: number
  speed: number
}

export interface ParticleFieldProps {
  /** Particles per 1000x1000 CSS pixels. Keeps density sane on any viewport. */
  density?: number
  className?: string
  /** Pointer influence radius in px. 0 disables pointer interaction. */
  pointerRadius?: number
}

/**
 * Ambient particle field on a 2D canvas.
 *
 * Canvas rather than WebGL on purpose: the hero needs a few dozen slow drifting
 * specks, not thousands of shaded sprites, so a WebGL context would buy nothing
 * and cost a GPU round-trip per frame. The canvas is sized to the device pixel
 * ratio (capped at 2 so a 3x phone does not render 9x the pixels), the loop stops
 * entirely when the tab is hidden, and nothing is drawn at all under reduced
 * motion.
 *
 * Particles drift on a slow noise-free sine so motion is predictable, and the
 * pointer gently pushes them aside - the same physics the graph nodes use, at a
 * fraction of the amplitude.
 */
export function ParticleField({
  density = 26,
  className = '',
  pointerRadius = 120,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = usePrefersReducedMotion()
  const visible = useDocumentVisible()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    // Hidden tab: the canvas stays mounted (so it keeps its size on return) but
    // the render loop is torn down, so a backgrounded page costs nothing.
    if (reduced || !visible) return undefined

    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return undefined

    let width = 0
    let height = 0
    let particles: Particle[] = []
    let frame = 0
    let pointerX = -9999
    let pointerY = -9999

    const dpr = () => Math.min(window.devicePixelRatio || 1, 2)

    const seed = () => {
      const ratio = dpr()
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)

      // Deterministic-ish spread using a simple LCG so the field looks organic
      // without being reshuffled on every resize.
      let seedState = 0x2f6e2b1
      const random = () => {
        seedState = (seedState * 1103515245 + 12345) & 0x7fffffff
        return seedState / 0x7fffffff
      }

      const area = (width * height) / 1_000_000
      const count = Math.round(density * Math.max(0.6, area))
      particles = Array.from({ length: count }, () => ({
        x: random() * width,
        y: random() * height,
        vx: (random() - 0.5) * 0.06,
        vy: (random() - 0.5) * 0.06,
        r: 0.6 + random() * 1.3,
        alpha: 0.12 + random() * 0.3,
        phase: random() * Math.PI * 2,
        speed: 0.25 + random() * 0.5,
      }))
    }

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height)

      for (const particle of particles) {
        // Slow vertical wander on top of the constant drift.
        particle.y += particle.vy + Math.sin(time * 0.0004 + particle.phase) * 0.012
        particle.x += particle.vx + Math.cos(time * 0.0003 + particle.phase) * 0.012

        if (pointerRadius > 0) {
          const dx = particle.x - pointerX
          const dy = particle.y - pointerY
          const distance = Math.hypot(dx, dy)
          if (distance < pointerRadius && distance > 0.5) {
            // Repulsion falls off linearly with distance; amplitude capped so
            // the field never looks like it is being blown apart.
            const force = (1 - distance / pointerRadius) * 0.5
            particle.x += (dx / distance) * force
            particle.y += (dy / distance) * force
          }
        }

        // Wrap rather than respawn, so density stays constant.
        if (particle.x < -8) particle.x = width + 8
        if (particle.x > width + 8) particle.x = -8
        if (particle.y < -8) particle.y = height + 8
        if (particle.y > height + 8) particle.y = -8

        const twinkle = 0.7 + 0.3 * Math.sin(time * 0.001 * particle.speed + particle.phase)
        context.globalAlpha = particle.alpha * twinkle
        context.fillStyle = '#a5b4fc'
        context.beginPath()
        context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2)
        context.fill()
      }

      context.globalAlpha = 1
      frame = requestAnimationFrame(draw)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      const bounds = canvas.getBoundingClientRect()
      pointerX = event.clientX - bounds.left
      pointerY = event.clientY - bounds.top
    }

    const onPointerLeave = () => {
      pointerX = -9999
      pointerY = -9999
    }

    seed()
    frame = requestAnimationFrame(draw)

    const resizeObserver = new ResizeObserver(() => seed())
    resizeObserver.observe(canvas)

    canvas.addEventListener('pointermove', onPointerMove, { passive: true })
    canvas.addEventListener('pointerleave', onPointerLeave)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [reduced, visible, density, pointerRadius])

  // The canvas element itself always stays mounted so the ResizeObserver keeps
  // a valid box; only the draw loop is conditional.
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-auto h-full w-full ${className}`}
    />
  )
}
