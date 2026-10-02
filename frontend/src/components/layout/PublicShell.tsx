import { Suspense, type ReactNode } from 'react'

import { ContentLoader } from './PageLoader'
import { SiteHeader } from './SiteHeader'

/**
 * Lightweight frame for pages that work without an account (opportunity
 * browsing). Keeps the public header instead of showing an authenticated
 * sidebar full of links a visitor cannot use yet.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <Suspense fallback={<ContentLoader />}>{children}</Suspense>
      </main>
    </div>
  )
}
