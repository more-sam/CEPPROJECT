/**
 * Ambient lighting layer. Purely decorative depth - no interaction, no layout
 * impact, hidden from assistive technology.
 *
 * The aurora blobs drift slowly (respecting prefers-reduced-motion via the
 * global override in index.css) and a sparse starfield twinkles above a faint
 * engineering grid for the futuristic read.
 */

/** Deterministic star positions so the field never re-shuffles on re-render. */
const STARS = Array.from({ length: 42 }, (_, i) => {
  const x = ((i * 37) % 101) / 100; // 0..1 with a little spread
  const y = ((i * 61) % 97) / 100;
  const size = i % 5 === 0 ? 2 : 1;
  const delay = ((i * 13) % 40) / 10; // 0..4s
  const duration = 3 + ((i * 7) % 30) / 10; // 3..6s
  return { x, y, size, delay, duration };
});

export function AmbientBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-ink-950" />

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
      {/* A faint plasma wisp for extra color depth. */}
      <div
        className="absolute left-[30%] top-[55%] h-[300px] w-[300px] rounded-full bg-plasma-500/8 blur-[140px]"
        style={{ animation: 'sb-aurora-drift 40s ease-in-out 6s infinite' }}
      />

      {/* Faint engineering grid. */}
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(148 163 184 / 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.12) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at 50% 0%, #000 20%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, #000 20%, transparent 72%)',
        }}
      />

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
    </div>
  );
}
