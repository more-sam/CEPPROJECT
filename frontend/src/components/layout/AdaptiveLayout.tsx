import type { ReactNode } from 'react'

import { useAuth } from '../../store/authContext'
import { AppLayout } from './AppLayout'
import { PageLoader } from './PageLoader'
import { PublicShell } from './PublicShell'

/**
 * Pages such as opportunity browsing work signed in or out.
 * A signed-in student gets the app sidebar; a visitor gets the public header.
 */
export function AdaptiveLayout({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'loading') return <PageLoader label="Restoring your session…" />
  if (status === 'authenticated') return <AppLayout>{children}</AppLayout>
  return <PublicShell>{children}</PublicShell>
}
