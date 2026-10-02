/**
 * Ambient lighting layer. Purely decorative depth - no interaction, no layout
 * impact, hidden from assistive technology.
 */
export function AmbientBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-ink-950" />
      <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[130px]" />
      <div className="absolute right-[-10%] top-1/4 h-[420px] w-[420px] rounded-full bg-aqua-500/12 blur-[120px]" />
      <div className="absolute bottom-[-15%] left-[-8%] h-[380px] w-[560px] rounded-full bg-brand-500/10 blur-[120px]" />
      {/* Faint engineering grid for the "futuristic" read. */}
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
    </div>
  )
}
