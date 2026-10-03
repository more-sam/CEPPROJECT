/**
 * Link-safety helpers.
 *
 * Centralise the security checks around external URLs (spec §10) so the
 * application never renders an unsafe href, never follows javascript:/data:
 * URIs, and never presents placeholder/example domains as real links.
 *
 * Every external link the app renders should pass through these helpers.
 */

/** Schemes that must never be rendered as navigation targets. */
const FORBIDDEN_SCHEMES = new Set([
  'javascript:',
  'data:',
  'file:',
  'vbscript:',
  'about:',
])

/** Domains that are documentation placeholders and must not be presented as real links. */
const PLACEHOLDER_HOSTS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'example',
  'localhost',
])

/**
 * Normalize a URL-ish string or return null.
 *
 * Only absolute http/https URLs survive this function.
 */
function normalizeUrl(raw: unknown): URL | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url
  } catch {
    return null
  }
}

/**
 * Return true when `value` is a safe external URL the app is willing to
 * render as a link.
 *
 * A type predicate, so callers can assign the guarded value straight to an
 * `href` (which rejects `string | null`) without a redundant fallback.
 *
 * Rejects:
 * - empty / non-string values
 * - non-http schemes (javascript:, data:, file:, …)
 * - placeholder/example domains
 * - malformed URLs
 */
export function isSafeExternalUrl(value: unknown): value is string {
  const url = normalizeUrl(value)
  if (url == null) return false
  if (FORBIDDEN_SCHEMES.has(url.protocol)) return false
  if (PLACEHOLDER_HOSTS.has(url.hostname)) return false
  if (url.hostname.endsWith('.example.com')) return false
  return true
}

/**
 * Render a website as a short, readable host for display (e.g.
 * "https://www.tcs.com/careers" -> "tcs.com").
 *
 * Returns null for anything that is not a safe external URL, so a caller can
 * show "Official website unavailable" instead of printing a raw or hostile
 * string.
 */
export function displayHost(value: unknown): string | null {
  if (!isSafeExternalUrl(value)) return null
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * Build the rel attribute array for an external link.
 *
 * Keeping `noopener` and `noreferrer` together is the safe default. We only
 * render `noreferrer` when `noopener` alone is sufficient, but the two are
 * commonly shipped together for external links.
 */
export function externalLinkRel(): string {
  return 'noopener noreferrer'
}

/**
 * Return a URL for a company favicon derived from its website domain (spec §3,
 * option 2).
 *
 * Falls back to the Google favicon proxy when a domain is available, otherwise
 * returns null so the CompanyLogo component can render the deterministic
 * initials placeholder.
 */
export function faviconUrlFromWebsite(websiteUrl: unknown): string | null {
  const url = normalizeUrl(websiteUrl)
  if (url == null) return null
  if (PLACEHOLDER_HOSTS.has(url.hostname)) return null
  if (FORBIDDEN_SCHEMES.has(url.protocol)) return null
  try {
    const domain = url.hostname.replace(/^www\./, '')
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
  } catch {
    return null
  }
}
