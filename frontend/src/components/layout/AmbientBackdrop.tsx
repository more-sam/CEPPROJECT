import { useEffect, useRef } from 'react'

import { ParticleField } from '../../motion/ParticleField'
import { useHasFinePointer, usePrefersReducedMotion } from '../../motion/usePrefersReducedMotion'

/** Deterministic star positions so the field never re-shuffles on re-render. */
const STARS = Array.from({ length: 42 }, (_, i) => {
  const x = ((i * 37) % 101) / 100 // 0..1 with a little spread
  const y = ((i * 61) % 97) / 100
  const size = i % 5 === 0 ? 2 : 1
  const delay = ((i * 13) % 40) / 10 // 0..4s
  const duration = 3 + ((i * 7) % 30) / 10 // 3..6s
  return { x, y, size, delay, duration }
})

/**
 * Ambient lighting layer.
 *
 * Six stacked depths, back to front: base colour, three slow aurora fields, the
 * drifting technical grid, a sparse particle field, and a static grain pass.
 * Purely decorative - no layout impact, hidden from assistive technology.
 *
 * The grid reacts to the pointer through two CSS custom properties
 * (`--sb-grid-x/y`) written directly on the DOM node from a damped rAF loop, so
 * the parallax costs no React renders and never animates a layout property.
 * Under reduced motion the loop does not start: the grid renders static, and the
 * particle canvas draws nothing.
 */
export function AmbientBackdrop() {
  const gridRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const finePointer = useHasFinePointer()

  useEffect(() => {
    const node = gridRef.current
    if (!node || reduced || !finePointer) return undefined

    let frame = 0
    const target = { x: 0, y: 0 }
    const current = { x: 0, y: 0 }
    // Hard ceiling on travel: the grid should feel like it has depth, not that
    // it is sliding around.
    const MAX_SHIFT = 14

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      target.x = (event.clientX / window.innerWidth - 0.5) * MAX_SHIFT
      target.y = (event.clientY / window.innerHeight - 0.5) * MAX_SHIFT
    }

    const onLeave = () => {
      target.x = 0
      target.y = 0
    }

    const loop = () => {
      current.x += (target.x - current.x) * 0.06
      current.y += (target.y - current.y) * 0.06
      node.style.setProperty('--sb-grid-x', current.x.toFixed(2))
      node.style.setProperty('--sb-grid-y', current.y.toFixed(2))
      frame = requestAnimationFrame(loop)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerout', onLeave)
    frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerout', onLeave)
    }
  }, [reduced, finePointer])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-surface-base" />

      {/* Aurora blobs - slow drifting gradient fields. */}
      <div
        className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[130px]"
        style={{ animation: 'sb-aurora-drift 26s ease-in-out infinite' }}
      />
      <div
        className="absolute right-[-10%] top-1/4 h-[420px] w-[420px] rounded-full bg-aqua-500/12 blur-[120px]"
        style={{ animation: 'sb-aurora-drift 34s ease-in-out infinite reverse' }}
      />
      <div
        className="absolute bottom-[-15%] left-[-8%] h-[380px] w-[560px] rounded-full bg-brand-500/10 blur-[120px]"
        style={{ animation: 'sb-aurora-drift 30s ease-in-out 3s infinite' }}
      />
      {/* A faint plasma wisp for extra colour depth. */}
      <div
        className="absolute left-[30%] top-[55%] h-[300px] w-[300px] rounded-full bg-plasma-500/8 blur-[140px]"
        style={{ animation: 'sb-aurora-drift 40s ease-in-out 6s infinite' }}
      />

      {/* Drifting technical grid, parallaxed by the pointer. */}
      <div
        ref={gridRef}
        className="sb-grid-field absolute inset-0 opacity-[0.5]"
        style={{
          maskImage: 'radial-gradient(ellipse at 50% 0%, #000 10%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, #000 10%, transparent 75%)',
        }}
      />

      {/* Particle field. The canvas is the only element here that accepts the
          pointer, so it keeps `pointer-events-auto` while the rest do not. */}
      <div className="pointer-events-none absolute inset-0">
        <ParticleField density={22} pointerRadius={140} />
      </div>

      {/* Twinkling starfield. */}
      <div className="absolute inset-0">
        {STARS.map((star, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x * 100}%`,
              top: `${star.y * 100}%`,
              width: star.size,
              height: star.size,
              animation: `sb-twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Film grain. Static, and very low contrast - it should only be
          perceptible if you go looking for it. */}
      <div className="sb-noise absolute inset-0 opacity-[0.025] mix-blend-overlay" />
    </div>
  )
}
