import { useEffect, useRef, useState } from 'react'

/**
 * Company logo component.
 *
 * Strategy (spec §3):
 *   1. Explicit logo_url from the company record (highest priority).
 *   2. The company's website favicon, looked up from the website domain at
 *      render time (no extra dependency, no hardcoded list).
 *   3. A deterministic initials avatar as the final fallback.
 *
 * Logos are sized inside a clean rounded container, preserve aspect ratio, and
 * transparent images stay visible. A broken-src placeholder is set so the
 * browser never shows its native broken-image icon.
 */

interface CompanyLogoProps {
  /** Short display name used for the fallback initials (already stripped). */
  companyName: string
  logoUrl?: string | null
  /** The company's public website URL, used for favicon resolution. */
  websiteUrl?: string | null
  /** Container side length in pixels. */
  size?: number
  /** Always squash the image to fill the container (company logos are not square). */
  fill?: boolean
}

function slugifyForColor(raw: string): string {
  const colour = raw
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 6)
  if (!colour) return 'skillbridge'
  let hash = 0
  for (let i = 0; i < colour.length; i++) {
    hash = (hash * 31 + colour.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(36)
}

const PALETTE = [
  '#7dd3fc', // aqua
  '#a78bfa', // violet
  '#67e8f9', // cyan
  '#818cf8', // indigo
  '#34d399', // emerald
  '#f472b6', // pink
  '#fb923c', // orange
  '#2dd4bf', // teal
  '#facc15', // yellow
  '#c084fc', // purple
]

function faviconUrlForDomain(websiteUrl: string | null): string | null {
  if (!websiteUrl) return null
  try {
    const url = new URL(websiteUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }
    const domain = url.hostname.replace(/^www\./, '')
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  } catch {
    return null
  }
}

/** Initials for the deterministic fallback avatar. */
function initials(name: string): string {
  const parts = name.trim().split(/[\s\-_]+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function CompanyLogo({
  companyName,
  logoUrl,
  websiteUrl,
  size = 40,
  fill = true,
}: CompanyLogoProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Centralise the logo-loading decision (spec §3): logo_url → favicon → none.
  useEffect(() => {
    let next: string | null = null

    if (logoUrl) {
      try {
        const url = new URL(logoUrl)
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          next = logoUrl
        }
      } catch {
        // treat invalid urls as missing; fall through to favicon
      }
    }

    if (!next) {
      next = faviconUrlForDomain(websiteUrl ?? null)
    }

    setSrc(next)
    setFailed(false)
  }, [logoUrl, websiteUrl])

  const containerSize = size
  const hasImage = src != null && !failed

  return (
    <span
      className="inline-block overflow-hidden rounded-xl"
      style={{
        width: containerSize,
        height: containerSize,
        flexShrink: 0,
      }}
    >
      {hasImage ? (
        <img
          ref={imgRef}
          src={src}
          alt={`${companyName} logo`}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={fill ? 'h-full w-full object-cover' : 'h-full w-full object-contain'}
          style={{ display: 'block' }}
          onError={() => {
            setFailed(true)
            setSrc(null)
          }}
        />
      ) : (
        // Deterministic fallback per company (spec §9): same name, same colour,
        // same initials.
        <span
          aria-label={`${companyName} — no logo available`}
          style={{
            display: 'grid',
            placeItems: 'center',
            width: '100%',
            height: '100%',
            borderRadius: '1rem',
            background: `linear-gradient(135deg, ${
              PALETTE[Math.abs(hashStr(slugifyForColor(companyName))) % PALETTE.length]
            }80, ${
              PALETTE[(Math.abs(hashStr(slugifyForColor(companyName)) + 3) % PALETTE.length)]
            }40)`,
            color: 'rgba(15,23,42,0.75)',
            fontWeight: 600,
            fontSize: Math.round(containerSize * 0.26) + 'px',
          }}
        >
          {initials(companyName)}
        </span>
      )}
    </span>
  )
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return h
}
